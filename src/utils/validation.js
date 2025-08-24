// Sistema de validación completo para la app Gainz
import { logger } from './logger';

/**
 * Reglas de validación
 */
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    minLength: 5,
    maxLength: 100
  },
  password: {
    minLength: 6,
    maxLength: 50,
    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/
  },
  name: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
  },
  weight: {
    min: 0.5,
    max: 1000,
    pattern: /^\d+(\.\d{1,2})?$/
  },
  reps: {
    min: 1,
    max: 999,
    pattern: /^\d+$/
  },
  sets: {
    min: 1,
    max: 50,
    pattern: /^\d+$/
  }
};

/**
 * Mensajes de error personalizados
 */
const ERROR_MESSAGES = {
  required: 'Este campo es obligatorio',
  email: {
    invalid: 'Ingresa un correo electrónico válido',
    minLength: 'El correo debe tener al menos 5 caracteres',
    maxLength: 'El correo es demasiado largo'
  },
  password: {
    minLength: 'La contraseña debe tener al menos 6 caracteres',
    maxLength: 'La contraseña es demasiado larga',
    weak: 'La contraseña debe contener al menos una letra y un número',
    mismatch: 'Las contraseñas no coinciden'
  },
  name: {
    minLength: 'El nombre debe tener al menos 2 caracteres',
    maxLength: 'El nombre es demasiado largo',
    invalid: 'El nombre solo puede contener letras y espacios'
  },
  weight: {
    invalid: 'Ingresa un peso válido (ej: 10, 15.5)',
    min: 'El peso debe ser mayor a 0.5 kg',
    max: 'El peso no puede ser mayor a 1000 kg'
  },
  reps: {
    invalid: 'Las repeticiones deben ser un número entero',
    min: 'Debe ser al menos 1 repetición',
    max: 'No puede ser más de 999 repeticiones'
  },
  sets: {
    invalid: 'Los sets deben ser un número entero',
    min: 'Debe ser al menos 1 set',
    max: 'No puede ser más de 50 sets'
  }
};

/**
 * Sanitizar strings - remueve caracteres peligrosos
 */
export const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>'"&]/g, (char) => { // Escape HTML chars
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#x27;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .substring(0, 500); // Limit length
};

/**
 * Validar email
 */
export const validateEmail = (email) => {
  const sanitized = sanitizeString(email).toLowerCase();
  const rules = VALIDATION_RULES.email;
  
  if (!sanitized) return { isValid: false, error: ERROR_MESSAGES.required };
  if (sanitized.length < rules.minLength) return { isValid: false, error: ERROR_MESSAGES.email.minLength };
  if (sanitized.length > rules.maxLength) return { isValid: false, error: ERROR_MESSAGES.email.maxLength };
  if (!rules.pattern.test(sanitized)) return { isValid: false, error: ERROR_MESSAGES.email.invalid };
  
  return { isValid: true, value: sanitized };
};

/**
 * Validar contraseña
 */
export const validatePassword = (password, confirmPassword = null) => {
  if (!password) return { isValid: false, error: ERROR_MESSAGES.required };
  
  const rules = VALIDATION_RULES.password;
  
  if (password.length < rules.minLength) return { isValid: false, error: ERROR_MESSAGES.password.minLength };
  if (password.length > rules.maxLength) return { isValid: false, error: ERROR_MESSAGES.password.maxLength };
  
  // Verificar fortaleza básica
  if (!rules.pattern.test(password)) {
    return { isValid: false, error: ERROR_MESSAGES.password.weak };
  }
  
  // Verificar confirmación si se proporciona
  if (confirmPassword !== null && password !== confirmPassword) {
    return { isValid: false, error: ERROR_MESSAGES.password.mismatch };
  }
  
  return { isValid: true, value: password };
};

/**
 * Validar nombre
 */
export const validateName = (name) => {
  const sanitized = sanitizeString(name);
  const rules = VALIDATION_RULES.name;
  
  if (!sanitized) return { isValid: false, error: ERROR_MESSAGES.required };
  if (sanitized.length < rules.minLength) return { isValid: false, error: ERROR_MESSAGES.name.minLength };
  if (sanitized.length > rules.maxLength) return { isValid: false, error: ERROR_MESSAGES.name.maxLength };
  if (!rules.pattern.test(sanitized)) return { isValid: false, error: ERROR_MESSAGES.name.invalid };
  
  return { isValid: true, value: sanitized };
};

/**
 * Validar peso de ejercicio
 */
export const validateWeight = (weight) => {
  if (!weight) return { isValid: false, error: ERROR_MESSAGES.required };
  
  const sanitized = sanitizeString(weight.toString());
  const rules = VALIDATION_RULES.weight;
  
  if (!rules.pattern.test(sanitized)) return { isValid: false, error: ERROR_MESSAGES.weight.invalid };
  
  const numericValue = parseFloat(sanitized);
  if (numericValue < rules.min) return { isValid: false, error: ERROR_MESSAGES.weight.min };
  if (numericValue > rules.max) return { isValid: false, error: ERROR_MESSAGES.weight.max };
  
  return { isValid: true, value: numericValue };
};

/**
 * Validar repeticiones
 */
export const validateReps = (reps) => {
  if (!reps) return { isValid: false, error: ERROR_MESSAGES.required };
  
  const sanitized = sanitizeString(reps.toString());
  const rules = VALIDATION_RULES.reps;
  
  if (!rules.pattern.test(sanitized)) return { isValid: false, error: ERROR_MESSAGES.reps.invalid };
  
  const numericValue = parseInt(sanitized);
  if (numericValue < rules.min) return { isValid: false, error: ERROR_MESSAGES.reps.min };
  if (numericValue > rules.max) return { isValid: false, error: ERROR_MESSAGES.reps.max };
  
  return { isValid: true, value: numericValue };
};

/**
 * Validar sets
 */
export const validateSets = (sets) => {
  if (!sets) return { isValid: false, error: ERROR_MESSAGES.required };
  
  const sanitized = sanitizeString(sets.toString());
  const rules = VALIDATION_RULES.sets;
  
  if (!rules.pattern.test(sanitized)) return { isValid: false, error: ERROR_MESSAGES.sets.invalid };
  
  const numericValue = parseInt(sanitized);
  if (numericValue < rules.min) return { isValid: false, error: ERROR_MESSAGES.sets.min };
  if (numericValue > rules.max) return { isValid: false, error: ERROR_MESSAGES.sets.max };
  
  return { isValid: true, value: numericValue };
};

/**
 * Validador de formulario completo
 */
export const validateForm = (fields, rules) => {
  const errors = {};
  const values = {};
  let isValid = true;
  
  Object.keys(rules).forEach(fieldName => {
    const value = fields[fieldName];
    const rule = rules[fieldName];
    
    try {
      let result;
      
      switch (rule) {
        case 'email':
          result = validateEmail(value);
          break;
        case 'password':
          result = validatePassword(value, fields.confirmPassword);
          break;
        case 'name':
          result = validateName(value);
          break;
        case 'weight':
          result = validateWeight(value);
          break;
        case 'reps':
          result = validateReps(value);
          break;
        case 'sets':
          result = validateSets(value);
          break;
        default:
          result = { isValid: true, value };
      }
      
      if (!result.isValid) {
        errors[fieldName] = result.error;
        isValid = false;
      } else {
        values[fieldName] = result.value;
      }
    } catch (error) {
      logger.error(`Validation error for field ${fieldName}:`, error);
      errors[fieldName] = 'Error de validación';
      isValid = false;
    }
  });
  
  return { isValid, errors, values };
};

/**
 * Validar datos de entrada de API para prevenir inyecciones
 */
export const validateApiInput = (data) => {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Datos inválidos' };
  }
  
  const sanitized = {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.filter(item => 
        typeof item === 'string' || 
        (typeof item === 'number' && !isNaN(item) && isFinite(item))
      ).map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      // Skip invalid data types
      logger.warn(`Skipping invalid data type for key: ${key}`);
    }
  });
  
  return { isValid: true, data: sanitized };
};

/**
 * Rate limiting mejorado y menos restrictivo para formularios
 */
class RateLimiter {
  constructor() {
    this.attempts = new Map();
  }
  
  isAllowed(key, maxAttempts = 8, timeWindow = 180000) { // 8 intentos cada 3 minutos (más flexible)
    const now = Date.now();
    const keyAttempts = this.attempts.get(key) || { count: 0, resetTime: now + timeWindow, firstAttempt: now };
    
    // Si han pasado más de 3 minutos, resetear completamente
    if (now > keyAttempts.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + timeWindow, firstAttempt: now });
      return true;
    }
    
    // Si es el primer intento, permitir
    if (keyAttempts.count === 0) {
      keyAttempts.count = 1;
      keyAttempts.firstAttempt = now;
      this.attempts.set(key, keyAttempts);
      return true;
    }
    
    // Implementar backoff progresivo: después de 3 intentos, esperar solo 30 segundos
    if (keyAttempts.count >= 3 && keyAttempts.count < maxAttempts) {
      const timeSinceFirst = now - keyAttempts.firstAttempt;
      const shortCooldown = 30000; // 30 segundos de cooldown progresivo
      
      if (timeSinceFirst < shortCooldown) {
        return false; // Esperar 30 segundos después de 3 intentos
      }
    }
    
    // Si se alcanzó el máximo, bloquear hasta que termine el período completo
    if (keyAttempts.count >= maxAttempts) {
      return false;
    }
    
    keyAttempts.count++;
    this.attempts.set(key, keyAttempts);
    return true;
  }
  
  getRemainingTime(key) {
    const keyAttempts = this.attempts.get(key);
    if (!keyAttempts) return 0;
    
    const now = Date.now();
    
    // Si han hecho 3-7 intentos, usar cooldown corto
    if (keyAttempts.count >= 3 && keyAttempts.count < 8) {
      const shortCooldownEnd = keyAttempts.firstAttempt + 30000;
      if (now < shortCooldownEnd) {
        return Math.max(0, shortCooldownEnd - now);
      }
    }
    
    // Para 8+ intentos, usar el tiempo completo
    return Math.max(0, keyAttempts.resetTime - now);
  }
  
  // Método para resetear intentos cuando el login es exitoso
  clearAttempts(key) {
    this.attempts.delete(key);
  }
  
  // Obtener información detallada del estado
  getStatus(key) {
    const keyAttempts = this.attempts.get(key);
    if (!keyAttempts) {
      return { attempts: 0, isBlocked: false, remainingTime: 0 };
    }
    
    const now = Date.now();
    const remainingTime = this.getRemainingTime(key);
    
    return {
      attempts: keyAttempts.count,
      isBlocked: !this.isAllowed(key) && keyAttempts.count > 0,
      remainingTime,
      maxAttempts: 8
    };
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Ejemplo de uso del validador
 */
export const FormValidationExample = {
  login: (email, password) => {
    return validateForm(
      { email, password },
      { email: 'email', password: 'password' }
    );
  },
  
  register: (name, email, password, confirmPassword) => {
    return validateForm(
      { name, email, password, confirmPassword },
      { name: 'name', email: 'email', password: 'password' }
    );
  },
  
  workoutSet: (weight, reps) => {
    return validateForm(
      { weight, reps },
      { weight: 'weight', reps: 'reps' }
    );
  }
};
