import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { colors, spacing, typography } from '../styles/globalStyles';

/**
 * Componente que muestra notificaciones de conectividad
 * Se muestra automáticamente cuando hay cambios en la conexión
 */
const ConnectivityNotification = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const nowOnline = state.isConnected && state.isInternetReachable !== false;
      const wasOnline = isOnline;
      
      setIsOnline(nowOnline);
      
      // Show notification when connectivity changes
      if (wasOnline !== nowOnline) {
        showConnectivityNotification(nowOnline);
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  const showConnectivityNotification = (online) => {
    setShowNotification(true);
    
    // Animate in
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      // Stay visible for 2 seconds (offline) or 1 second (online)
      Animated.delay(online ? 1000 : 2000),
      // Animate out
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowNotification(false);
    });
  };

  if (!showNotification) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.notification,
        isOnline ? styles.onlineNotification : styles.offlineNotification,
        {
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.notificationIcon}>
        {isOnline ? '✅' : '⚠️'}
      </Text>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>
          {isOnline ? 'Conectado' : 'Sin conexión'}
        </Text>
        <Text style={styles.notificationMessage}>
          {isOnline 
            ? 'Sincronizando datos...' 
            : 'Trabajando en modo offline'
          }
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  notification: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  onlineNotification: {
    backgroundColor: colors.success,
  },
  offlineNotification: {
    backgroundColor: colors.warning,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
    marginBottom: spacing.xs,
  },
  notificationMessage: {
    ...typography.caption,
    color: colors.background,
    opacity: 0.9,
  },
});

export default ConnectivityNotification;
