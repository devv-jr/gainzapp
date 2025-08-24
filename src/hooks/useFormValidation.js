// Hook personalizado para manejar validación de formularios
import { useState, useCallback } from 'react';
import { validateForm, rateLimiter } from '../utils/validation';
import { logger } from '../utils/logger';

/**
 * Hook para manejar validación de formularios con state
 */
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouchedState] = useState({});

  // Actualizar un campo específico
  const setValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  // Marcar campo como tocado (para mostrar errores)
  const setTouched = useCallback((field, isTouched = true) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  // Validar un campo específico
  const validateField = useCallback((field, value) => {
    if (!validationRules[field]) return true;

    const fieldValidation = validateForm(
      { [field]: value }, 
      { [field]: validationRules[field] }
    );

    if (!fieldValidation.isValid) {
      setErrors(prev => ({ ...prev, [field]: fieldValidation.errors[field] }));
      return false;
    } else {
      setErrors(prev => ({ ...prev, [field]: null }));
      return true;
    }
  }, [validationRules]);

  // Validar todo el formulario
  const validate = useCallback(() => {
    const validation = validateForm(values, validationRules);
    setErrors(validation.errors);
    return validation;
  }, [values, validationRules]);

  // Reset del formulario
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Enviar formulario con validación y rate limiting
  const handleSubmit = useCallback(async (onSubmit, rateLimitKey = null, rateLimitConfig = {}) => {
    const { maxAttempts = 5, timeWindow = 300000 } = rateLimitConfig; // 5 intentos cada 5 minutos por defecto
    
    // Rate limiting
    if (rateLimitKey && !rateLimiter.isAllowed(rateLimitKey, maxAttempts, timeWindow)) {
      const remainingTime = Math.ceil(rateLimiter.getRemainingTime(rateLimitKey) / 1000);
      setErrors({ general: `Demasiados intentos. Espera ${remainingTime} segundos.` });
      return { success: false, error: 'Rate limited' };
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Validar formulario
      const validation = validate();
      if (!validation.isValid) {
        logger.warn('Form validation failed:', validation.errors);
        return { success: false, errors: validation.errors };
      }

      // Ejecutar función de envío
      const result = await onSubmit(validation.values);
      logger.info('Form submitted successfully');
      return { success: true, data: result };

    } catch (error) {
      logger.error('Form submission failed:', error);
      setErrors({ general: error.message || 'Error al enviar formulario' });
      return { success: false, error: error.message };
    } finally {
      setIsSubmitting(false);
    }
  }, [validate]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setTouched,
    validateField,
    validate,
    reset,
    handleSubmit,
    
    // Helpers
    getFieldError: (field) => touched[field] ? errors[field] : null,
    isFieldValid: (field) => !errors[field],
    hasErrors: Object.values(errors).some(error => error),
    isValid: Object.keys(validationRules).every(field => !errors[field])
  };
};

/**
 * Hook específico para WorkoutSet
 */
export const useWorkoutSetValidation = () => {
  return useFormValidation(
    { weight: '', reps: '' },
    { weight: 'weight', reps: 'reps' }
  );
};

/**
 * Hook específico para Login
 */
export const useLoginValidation = () => {
  return useFormValidation(
    { email: '', password: '' },
    { email: 'email', password: 'password' }
  );
};

/**
 * Hook específico para Register
 */
export const useRegisterValidation = () => {
  return useFormValidation(
    { name: '', email: '', password: '', confirmPassword: '' },
    { name: 'name', email: 'email', password: 'password' }
  );
};

/**
 * Hook para validación en tiempo real con debounce
 */
export const useRealtimeValidation = (field, rule, delay = 500) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  
  const [timeoutId, setTimeoutId] = useState(null);

  const validateValue = useCallback((newValue) => {
    setIsValidating(true);
    
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout for validation
    const id = setTimeout(() => {
      const validation = validateForm(
        { [field]: newValue },
        { [field]: rule }
      );

      if (!validation.isValid) {
        setError(validation.errors[field]);
      } else {
        setError('');
      }
      setIsValidating(false);
    }, delay);

    setTimeoutId(id);
  }, [field, rule, delay, timeoutId]);

  const handleValueChange = useCallback((newValue) => {
    setValue(newValue);
    validateValue(newValue);
  }, [validateValue]);

  return {
    value,
    error,
    isValidating,
    setValue: handleValueChange,
    isValid: !error && !isValidating
  };
};
