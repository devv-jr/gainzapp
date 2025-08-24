import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';
import { useAuth } from '../contexts/AuthContext';

const Profile = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Función para formatear la fecha de membresía
  const getMemberSince = () => {
    // Debug: mostrar qué información tenemos disponible
    console.log('🔍 Debug user data:', {
      createdAt: user?.createdAt,
      metadata: user?.metadata,
      metadataCreationTime: user?.metadata?.creationTime,
    });
    
    if (user?.createdAt) {
      try {
        const createdDate = new Date(user.createdAt);
        // Verificar que la fecha es válida
        if (!isNaN(createdDate.getTime())) {
          console.log('✅ Usando createdAt de Firestore:', createdDate);
          return createdDate.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long' 
          });
        }
      } catch (error) {
        console.warn('Error al parsear fecha de creación:', error);
      }
    }
    
    // Si no hay fecha disponible, usar la fecha de creación de Firebase Auth
    if (user?.metadata?.creationTime) {
      try {
        const createdDate = new Date(user.metadata.creationTime);
        if (!isNaN(createdDate.getTime())) {
          console.log('✅ Usando metadata de Firebase Auth:', createdDate);
          return createdDate.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long' 
          });
        }
      } catch (error) {
        console.warn('Error al parsear metadata de Firebase:', error);
      }
    }
    
    // Fallback: fecha actual como aproximación
    console.log('⚠️ Usando fecha actual como fallback');
    return new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // Datos del usuario desde auth context
  const userData = {
    name: user?.displayName || 'Usuario',
    email: user?.email || 'email@example.com',
    joinDate: getMemberSince(),
    totalWorkouts: user?.totalWorkouts || 0,
    avatar: user?.photoURL || null,
  };

  const appVersion = '2.0.0';
  const currentYear = new Date().getFullYear(); // Agregar año actual

  const handleSendFeedback = () => {
    Alert.alert(
      'Enviar Feedback',
      '¿Qué tipo de feedback quieres enviar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sugerencia', onPress: () => sendEmail('suggestion') },
        { text: 'Reportar Error', onPress: () => sendEmail('bug') },
      ]
    );
  };

  const sendEmail = (type) => {
    const subject = type === 'suggestion' ? 'Sugerencia para GainzApp' : 'Reporte de Error - GainzApp';
    const body = type === 'suggestion' 
      ? 'Hola,\n\nMe gustaría sugerir lo siguiente para mejorar GainzApp:\n\n'
      : 'Hola,\n\nHe encontrado un error en GainzApp:\n\nDescripción del error:\n\nPasos para reproducir:\n1. \n2. \n3. \n\nDispositivo: \nVersión de la app: ' + appVersion + '\n\n';

    const emailUrl = `mailto:gainzcontacto@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.canOpenURL(emailUrl).then(supported => {
      if (supported) {
        Linking.openURL(emailUrl);
      } else {
        Alert.alert(
          'Error',
          'No se pudo abrir el cliente de correo. Por favor, envía tu feedback a: gainzcontacto@gmail.com'
        );
      }
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
              console.error('Error al cerrar sesión:', error);
            } finally {
              setIsLoggingOut(false);
            }
          }
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Editar Perfil', 'Función próximamente disponible');
  };

  const handleChangePassword = () => {
    Alert.alert('Cambiar Contraseña', 'Función próximamente disponible');
  };

  const handlePrivacyPolicy = () => {
    const url = 'https://devv-jr.github.io/GAINZ//#/privacy';
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se pudo abrir el enlace');
      }
    });
  };

  const handleTermsOfService = () => {
    const url = 'https://devv-jr.github.io/GAINZ//#/terms';
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se pudo abrir el enlace');
      }
    });
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement, iconFamily = 'Ionicons' }) => {
    const IconComponent = iconFamily === 'MaterialIcons' ? MaterialIcons : 
                         iconFamily === 'Feather' ? Feather : Ionicons;
    
    return (
      <TouchableOpacity style={styles.settingItem} onPress={onPress}>
        <View style={styles.settingIcon}>
          <IconComponent name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={globalStyles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {userData.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{userData.name.charAt(0)}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.editAvatarButton}>
                <Ionicons name="camera" size={16} color={colors.background} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userData.name}</Text>
              <Text style={styles.userEmail}>{userData.email}</Text>
              <View style={styles.userStats}>
                <Text style={styles.userStatsText}>
                  Miembro desde {userData.joinDate} • {userData.totalWorkouts} entrenamientos
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Feather name="edit-2" size={16} color={colors.primary} />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>
        {/* Support-Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ajustes y Soporte</Text>
          
          <SettingItem
            icon="mail"
            title="Enviar Feedback"
            subtitle="Sugerencias o reportar errores"
            onPress={handleSendFeedback}
          />
          
          <SettingItem
            icon="help-circle"
            title="Centro de Ayuda"
            subtitle="Preguntas frecuentes"
            onPress={() => Alert.alert('Centro de Ayuda', 'Función próximamente disponible')}
          />
          
          <SettingItem
            icon="shield"
            title="Política de Privacidad"
            onPress={handlePrivacyPolicy}
          />
          
          <SettingItem
            icon="document-text"
            title="Términos de Servicio"
            onPress={handleTermsOfService}
          />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Gainz v{appVersion}</Text>
          <Text style={styles.appCopyright}>© {currentYear} Gainz. Todos los derechos reservados.</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={colors.error} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h2,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...globalStyles.shadow,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  userStats: {
    marginTop: spacing.xs,
  },
  userStatsText: {
    ...typography.small,
    color: colors.textMuted,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  editButtonText: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    fontWeight: '500',
  },
  settingSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  appVersion: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  appCopyright: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutButtonText: {
    ...typography.body,
    color: colors.error,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
});

export default Profile;