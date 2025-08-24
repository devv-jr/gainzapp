// Componente para mostrar métricas de performance de la API (solo en desarrollo)
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../styles/globalStyles';
import exerciseApi from '../services/exerciseApi';

const APIPerformanceMonitor = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState(null);
  
  // Solo mostrar en desarrollo
  if (!__DEV__) return null;

  const loadMetrics = () => {
    const report = exerciseApi.getPerformanceReport();
    setMetrics(report);
  };

  useEffect(() => {
    if (isVisible) {
      loadMetrics();
      // Actualizar métricas cada 5 segundos cuando está abierto
      const interval = setInterval(loadMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const showPerformanceWarning = exerciseApi.shouldShowPerformanceWarning();

  return (
    <>
      {/* Botón flotante para abrir métricas */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          showPerformanceWarning && styles.warningButton
        ]}
        onPress={() => setIsVisible(true)}
      >
        <Ionicons 
          name="analytics" 
          size={20} 
          color={showPerformanceWarning ? colors.error : colors.primary} 
        />
        <Text style={[
          styles.buttonText,
          showPerformanceWarning && styles.warningText
        ]}>
          API
        </Text>
      </TouchableOpacity>

      {/* Modal con métricas */}
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>API Performance Monitor</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.metricsContainer}>
              {metrics && (
                <>
                  {/* Métricas generales */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Métricas Generales</Text>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Total Requests:</Text>
                      <Text style={styles.metricValue}>{metrics.requests}</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Success Rate:</Text>
                      <Text style={[
                        styles.metricValue,
                        metrics.successRate < 80 && styles.errorValue
                      ]}>
                        {metrics.successRate.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Avg Response Time:</Text>
                      <Text style={[
                        styles.metricValue,
                        metrics.averageResponseTime > 10000 && styles.errorValue
                      ]}>
                        {metrics.averageResponseTime.toFixed(0)}ms
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Cache Hit Rate:</Text>
                      <Text style={styles.metricValue}>
                        {(metrics.cacheHitRate * 100).toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  {/* Failures recientes */}
                  {metrics.recentFailures && metrics.recentFailures.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Fallos Recientes</Text>
                      {metrics.recentFailures.map((failure, index) => (
                        <View key={index} style={styles.failureItem}>
                          <Text style={styles.failureEndpoint}>{failure.endpoint}</Text>
                          <Text style={styles.failureTime}>
                            {new Date(failure.timestamp).toLocaleTimeString()}
                          </Text>
                          <Text style={styles.failureDuration}>{failure.duration}ms</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Estado del servicio */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Estado del Servicio</Text>
                    <Text style={styles.statusText}>
                      {showPerformanceWarning 
                        ? '⚠️ Performance issues detected' 
                        : '✅ Service running normally'
                      }
                    </Text>
                  </View>

                  {/* Acciones */}
                  <View style={styles.section}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => {
                        exerciseApi.clearExerciseCache();
                        loadMetrics();
                      }}
                    >
                      <Text style={styles.actionButtonText}>Clear Cache</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={loadMetrics}
                    >
                      <Text style={styles.actionButtonText}>Refresh Metrics</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    top: 100,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 25,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  warningButton: {
    backgroundColor: colors.errorSurface || '#FFE5E5',
  },
  buttonText: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  warningText: {
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  metricsContainer: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  metricLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metricValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  errorValue: {
    color: colors.error,
  },
  failureItem: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  failureEndpoint: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  failureTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  failureDuration: {
    ...typography.caption,
    color: colors.error,
  },
  statusText: {
    ...typography.body,
    color: colors.text,
  },
  actionButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});

export default APIPerformanceMonitor;
