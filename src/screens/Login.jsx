import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { globalStyles, colors } from '../styles/globalStyles';
import { useAuth } from '../contexts/AuthContext';
import { FormValidationExample, rateLimiter } from '../utils/validation';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showResetOption, setShowResetOption] = useState(false);
  const { login, error, clearError, user } = useAuth();

  // If user is already logged in, redirect to the authenticated stack
  // The navigation will be handled automatically by AppNavigator
  useEffect(() => {
    if (user) {
      // No manual navigation needed - AppNavigator will handle this
      // by showing the Authenticated stack when user is logged in
    }
  }, [user, navigation]);

  // Update local error message when auth context error changes
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
    }
  }, [error]);

  const handleLogin = async () => {
    // Clear previous errors
    setErrorMessage('');
    setFieldErrors({});
    clearError();
    
    // Rate limiting check con manejo mejorado
    const clientId = `login_${email}`;
    const rateLimitStatus = rateLimiter.getStatus(clientId);
    
    if (!rateLimiter.isAllowed(clientId, 8, 180000)) { // 8 intentos cada 3 minutos
      const remainingSeconds = Math.ceil(rateLimitStatus.remainingTime / 1000);
      
      let message;
      if (rateLimitStatus.attempts < 8) {
        // Cooldown corto de 30 segundos después de 3 intentos
        message = `Por favor espera ${remainingSeconds} segundos antes de intentar nuevamente. (${rateLimitStatus.attempts}/8 intentos)`;
      } else {
        // Cooldown largo después de 8 intentos
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        message = `Demasiados intentos de inicio de sesión. Por favor espera ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''} antes de intentar nuevamente.`;
        setShowResetOption(true); // Mostrar opción de reset después de muchos intentos
      }
      
      setErrorMessage(message);
      return;
    }
    
    // Validate form
    const validation = FormValidationExample.login(email, password);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setErrorMessage('Por favor corrige los errores del formulario');
      return;
    }
    
    setIsLoading(true);
    try {
      await login(validation.values.email, validation.values.password);
      // Si el login es exitoso, limpiar los intentos de rate limiting
      rateLimiter.clearAttempts(clientId);
      // Navigation will happen automatically because of the useEffect above
    } catch (error) {
      // El error ya está configurado en el contexto, pero agregamos info de intentos
      const attemptsLeft = 8 - (rateLimitStatus.attempts + 1);
      if (attemptsLeft > 0 && attemptsLeft <= 3) {
        setTimeout(() => {
          setErrorMessage(prev => prev + ` (Te quedan ${attemptsLeft} intento${attemptsLeft > 1 ? 's' : ''})`);
        }, 100);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAttempts = () => {
    const clientId = `login_${email}`;
    rateLimiter.clearAttempts(clientId);
    setErrorMessage('');
    setShowResetOption(false);
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar style="light" />
      <View style={globalStyles.safeContainer}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={globalStyles.title}>Iniciar Sesión</Text>
          <Text style={globalStyles.bodyText}>Bienvenido de nuevo</Text>
          
          <View style={{ marginTop: 32 }}>
            <Text style={globalStyles.inputLabel}>Correo Electrónico</Text>
            <TextInput 
              style={[
                globalStyles.input,
                fieldErrors.email && styles.inputError
              ]}
              placeholder="Ingresa tu correo"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            {fieldErrors.email && (
              <Text style={styles.errorText}>{fieldErrors.email}</Text>
            )}
            
            <Text style={[globalStyles.inputLabel, { marginTop: 16 }]}>Contraseña</Text>
            <TextInput 
              style={[
                globalStyles.input,
                fieldErrors.password && styles.inputError
              ]}
              placeholder="Ingresa tu contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {fieldErrors.password && (
              <Text style={styles.errorText}>{fieldErrors.password}</Text>
            )}
            
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            
            {showResetOption && (
              <TouchableOpacity 
                style={[styles.resetButton, { marginTop: 12 }]}
                onPress={handleResetAttempts}
              >
                <Text style={styles.resetButtonText}>Limpiar intentos y reintentar</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[globalStyles.primaryButton, { marginTop: 24 }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={globalStyles.primaryButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
              <Text style={{ fontSize: 16, color: colors.textSecondary, marginRight: 4 }}>
                ¿No tienes cuenta?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                  Crear Cuenta
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  resetButton: {
    backgroundColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  resetButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  }
});