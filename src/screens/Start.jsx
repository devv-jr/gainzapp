import React from 'react';
import { View, Text, TouchableOpacity, Image, Animated, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { globalStyles, colors, spacing } from '../styles/globalStyles';

export default function Start({ navigation }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar style="light" />
      
      {/* Logo y contenido principal */}
      <View style={styles.contentContainer}>
        <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
          <Image 
            source={require('../../assets/gainz-icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        
        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.welcomeTitle}>Bienvenido a</Text>
          <Text style={styles.appName}>GAINZ v2</Text>
          <Text style={styles.subtitle}>
            Transformate y alcanza tus objetivos de fitness con la nueva versión de GAINZ
          </Text>
        </Animated.View>
        
        {/* Emojis animados relacionados con el gimnasio */}
        <Animated.View style={[styles.iconsContainer, { opacity: fadeAnim }]}>
          <Text style={styles.fitnessIcon}>💪</Text>
          <Text style={styles.fitnessIcon}>🏋️</Text>
          <Text style={styles.fitnessIcon}>🔥</Text>
        </Animated.View>
      </View>
      
      {/* Botones en la parte inferior */}
      <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={globalStyles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={globalStyles.primaryButtonText}>Iniciar Sesión</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[globalStyles.secondaryButton, { marginTop: spacing.md }]}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={globalStyles.secondaryButtonText}>Crear Cuenta</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = {
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '300',
    marginBottom: spacing.xs,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
    marginBottom: spacing.xl,
  },
  fitnessIcon: {
    fontSize: 32,
    marginHorizontal: spacing.md,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
};