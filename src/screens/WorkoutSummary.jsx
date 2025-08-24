import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';

const WorkoutSummary = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { summary, routine, exerciseData } = route.params;

  const shareWorkout = async () => {
    try {
      const shareContent = `¡Acabo de completar mi entrenamiento en Gainz! 💪\n\n` +
        `🏋️ Rutina: ${summary.routine}\n` +
        `⏱️ Duración: ${summary.duration} minutos\n` +
        `🎯 Ejercicios: ${summary.exercises}\n` +
        `📊 Total sets: ${summary.totalSets}\n` +
        `🔥 Total reps: ${summary.totalReps}\n` +
        `💪 Volumen total: ${summary.totalVolume.toFixed(1)}kg\n\n` +
        `¡Sigue tu progreso con Gainz!`;

      await Share.share({
        message: shareContent,
      });
    } catch (error) {
      console.error('Error sharing workout:', error);
    }
  };

  const getMotivationalMessage = (rating) => {
    const messages = {
      excellent: "¡Increíble! Tuviste un entrenamiento excepcional. Sigue así y alcanzarás todas tus metas 🔥",
      good: "¡Buen trabajo! Completaste tu rutina con éxito. Cada entrenamiento te acerca más a tus objetivos 💪",
      okay: "¡Lo lograste! Aunque no te sintieras al 100%, lo importante es que no te rendiste. ¡Mañana será mejor! 🌟"
    };
    return messages[rating] || messages.good;
  };

  const getRatingIcon = (rating) => {
    const icons = {
      excellent: { name: 'trophy', color: colors.warning },
      good: { name: 'thumbs-up', color: colors.success },
      okay: { name: 'checkmark-circle', color: colors.primary }
    };
    return icons[rating] || icons.good;
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const rating = getRatingIcon(summary.rating);

  return (
    <View style={globalStyles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Resumen del Entrenamiento</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={shareWorkout}
        >
          <Feather name="share-2" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {/* Success Message */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name={rating.name} size={48} color={rating.color} />
          </View>
          <Text style={styles.successTitle}>¡Entrenamiento Completado!</Text>
          <Text style={styles.routineName}>{summary.routine}</Text>
          <Text style={styles.motivationalMessage}>
            {getMotivationalMessage(summary.rating)}
          </Text>
        </View>

        {/* Key Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Estadísticas Principales</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>{formatDuration(summary.duration)}</Text>
              <Text style={styles.statLabel}>Duración</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="fitness-center" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>{summary.exercises}</Text>
              <Text style={styles.statLabel}>Ejercicios</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="layers" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>{summary.totalSets}</Text>
              <Text style={styles.statLabel}>Total Sets</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="repeat" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>{summary.totalReps}</Text>
              <Text style={styles.statLabel}>Total Reps</Text>
            </View>
          </View>

          {/* Volume Card */}
          <View style={styles.volumeCard}>
            <View style={styles.volumeHeader}>
              <MaterialIcons name="trending-up" size={24} color={colors.success} />
              <Text style={styles.volumeTitle}>Volumen Total</Text>
            </View>
            <Text style={styles.volumeNumber}>
              {summary.totalVolume.toLocaleString('es-ES', { 
                minimumFractionDigits: 1,
                maximumFractionDigits: 1 
              })} kg
            </Text>
            <Text style={styles.volumeDescription}>
              Peso total levantado en este entrenamiento
            </Text>
          </View>
        </View>

        {/* Exercise Breakdown */}
        <View style={styles.exerciseBreakdown}>
          <Text style={styles.sectionTitle}>Desglose por Ejercicio</Text>
          
          {exerciseData.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <View style={styles.exerciseCompletion}>
                  {exercise.completed && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  )}
                </View>
              </View>
              
              <Text style={styles.exerciseMuscle}>{exercise.muscle}</Text>
              
              <View style={styles.setsBreakdown}>
                <Text style={styles.setsTitle}>
                  Sets completados: {exercise.sets.length}
                </Text>
                
                {exercise.sets.map((set, setIndex) => (
                  <View key={setIndex} style={styles.setRow}>
                    <Text style={styles.setNumber}>Set {set.set}</Text>
                    <Text style={styles.setData}>
                      {set.weight}kg × {set.reps} reps
                    </Text>
                    <Text style={styles.setVolume}>
                      {(set.weight * set.reps).toFixed(1)}kg
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Personal Records */}
        <View style={styles.recordsSection}>
          <Text style={styles.sectionTitle}>Posibles Récords</Text>
          <View style={styles.recordsContainer}>
            <View style={styles.recordItem}>
              <MaterialIcons name="emoji-events" size={20} color={colors.warning} />
              <Text style={styles.recordText}>
                Mayor volumen en {summary.routine}
              </Text>
            </View>
            <View style={styles.recordItem}>
              <Ionicons name="flash" size={20} color={colors.primary} />
              <Text style={styles.recordText}>
                Entrenamiento completado en {formatDuration(summary.duration)}
              </Text>
            </View>
          </View>
          <Text style={styles.recordsNote}>
            * Los récords se confirmarán cuando tengas más datos de entrenamiento
          </Text>
        </View>

        {/* Notes Section */}
        {summary.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notas del Entrenamiento</Text>
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{summary.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'RoutinesTab' })}
        >
          <Text style={styles.secondaryButtonText}>Ver Rutinas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
        >
          <Text style={styles.primaryButtonText}>Ir al Inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    textAlign: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  routineName: {
    ...typography.h4,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  motivationalMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  statsContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    width: '48%',
    marginBottom: spacing.sm,
  },
  statNumber: {
    ...typography.h3,
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },

  volumeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  volumeTitle: {
    ...typography.h4,
    marginLeft: spacing.sm,
  },
  volumeNumber: {
    ...typography.h1,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  volumeDescription: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },

  exerciseBreakdown: {
    marginBottom: spacing.xl,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  exerciseName: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
  exerciseCompletion: {
    marginLeft: spacing.sm,
  },
  exerciseMuscle: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  setsBreakdown: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
  },
  setsTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  setNumber: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
  },
  setData: {
    ...typography.small,
    fontWeight: '500',
    flex: 2,
    textAlign: 'center',
  },
  setVolume: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  recordsSection: {
    marginBottom: spacing.xl,
  },
  recordsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  recordText: {
    ...typography.body,
    marginLeft: spacing.sm,
    flex: 1,
  },
  recordsNote: {
    ...typography.small,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  notesSection: {
    marginBottom: spacing.xl,
  },
  notesContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notesText: {
    ...typography.body,
    lineHeight: 20,
  },

  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  primaryButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
});

export default WorkoutSummary;
