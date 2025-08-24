import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { globalStyles, colors, spacing } from '../styles/globalStyles';
import { useAuth } from '../contexts/AuthContext';
import { FormValidationExample, rateLimiter } from '../utils/validation';

const Register = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { register, error: authError, clearError, user } = useAuth();

  // If user is already logged in, don't navigate automatically
  // Let AppNavigator handle the navigation based on auth state
  useEffect(() => {
    if (user && !isLoading) {
      // Small delay to ensure user data is fully loaded
      const timer = setTimeout(() => {
        // Navigation will be handled by AppNavigator
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading]);

  // Update local error message when auth context error changes
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleRegister = async () => {
    // Reset error
    setError('');
    setFieldErrors({});
    clearError();
    
    // Rate limiting check
    const clientId = `register_${email}`;
    if (!rateLimiter.isAllowed(clientId, 3, 600000)) { // 3 intentos cada 10 minutos
      const remainingTime = Math.ceil(rateLimiter.getRemainingTime(clientId) / 1000);
      setError(`Demasiados intentos de registro. Intenta nuevamente en ${remainingTime} segundos.`);
      return;
    }
    
    // Validate form
    const validation = FormValidationExample.register(name, email, password, confirmPassword);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError('Por favor corrige los errores del formulario');
      return;
    }
    
    setIsLoading(true);
    try {
      await register(validation.values.name, validation.values.email, validation.values.password);
      // Don't navigate manually - let AppNavigator handle this
      // Navigation will happen automatically when user state changes
    } catch (error) {
      // Error is already set in the context and local state
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Image 
              source={require('../../assets/gainz-icon.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.headerText}>Crear Cuenta</Text>
            <Text style={styles.subHeaderText}>
              Completa los datos para comenzar tu transformación
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={globalStyles.inputLabel}>Nombre de Usuario</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Ingresa tu nombre de usuario"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={globalStyles.inputLabel}>Correo Electrónico</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Ingresa tu correo"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={globalStyles.inputLabel}>Contraseña</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Crea una contraseña"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={globalStyles.inputLabel}>Confirmar Contraseña</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Confirma tu contraseña"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[globalStyles.primaryButton, { marginTop: spacing.lg }]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={globalStyles.primaryButtonText}>Crear Cuenta</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>¿Ya tienes una cuenta?</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginLink}>Iniciar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subHeaderText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
});

export default Register;