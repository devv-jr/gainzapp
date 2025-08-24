import { StyleSheet } from 'react-native';

// Paleta de colores
export const colors = {
  // Colores principales
  primary: '#FACC15',        // Amarillo principal
  primaryDark: '#EAB308',    // Amarillo más oscuro
  primaryLight: '#FDE047',   // Amarillo más claro
  
  // Fondos oscuros
  background: '#0F0F0F',     // Negro profundo
  surface: '#1A1A1A',       // Gris muy oscuro
  card: '#262626',          // Gris oscuro para tarjetas
  
  // Textos
  textPrimary: '#FFFFFF',    // Texto principal blanco
  textSecondary: '#A3A3A3',  // Texto secundario gris
  textMuted: '#525252',      // Texto deshabilitado
  
  // Estados
  success: '#10B981',        // Verde
  error: '#EF4444',          // Rojo
  warning: '#F59E0B',        // Naranja
  info: '#3B82F6',           // Azul
  
  // Bordes y divisores
  border: '#404040',         // Borde sutil
  divider: '#2A2A2A',        // Línea divisoria
};

// Espaciado consistente
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Tipografía
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  bodySecondary: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
};

// Estilos globales comunes
export const globalStyles = StyleSheet.create({
  // Contenedores
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md, // Extra padding for status bar area
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md, // Extra padding for status bar area
  },
  
  // Tarjetas y superficies
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  surface: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
  },
  
  // Botones
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Inputs
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  
  // Textos comunes
  title: typography.h2,
  subtitle: typography.h4,
  bodyText: typography.body,
  captionText: typography.caption,
  
  // Utilidades
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  
  // Shadows
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});