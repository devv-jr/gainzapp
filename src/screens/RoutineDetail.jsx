import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';

const RoutineDetail = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { routine } = route.params;

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Principiante': return colors.success;
      case 'Intermedio': return colors.warning;
      case 'Avanzado': return colors.error;
      default: return colors.textMuted;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Músculo específico': return 'fitness-center';
      case 'Sin equipo': return 'accessibility';
      case 'Cardio': return 'favorite';
      default: return 'fitness-center';
    }
  };

  const handleFindExercises = () => {
    // Navegar de vuelta al tab navigator y luego a la biblioteca
    navigation.navigate('MainTabs', {
      screen: 'LibraryTab',
      params: {
        filterMuscle: routine.muscle === 'Todo el cuerpo' ? null : routine.muscle,
        routineName: routine.name 
      }
    });
  };

  return (
    <View style={globalStyles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          {routine.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={14} color={colors.background} />
              <Text style={styles.featuredText}>RECOMENDADA</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Routine Header */}
        <View style={styles.routineHeader}>
          <View style={styles.routineIconContainer}>
            <MaterialIcons 
              name={getCategoryIcon(routine.category)} 
              size={32} 
              color={colors.primary} 
            />
          </View>
          <View style={styles.routineHeaderInfo}>
            <Text style={styles.routineName}>{routine.name}</Text>
            <Text style={styles.routineDescription}>{routine.description}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="fitness-center" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>{routine.totalExercises}</Text>
              <Text style={styles.statLabel}>Ejercicios</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>{routine.estimatedTime}</Text>
              <Text style={styles.statLabel}>Duración</Text>
            </View>
          </View>
          
          {/* Card completa para el grupo muscular */}
          <View style={styles.muscleCard}>
            <Ionicons name="body" size={24} color={colors.primary} />
            <View style={styles.muscleInfo}>
              <Text style={styles.muscleTitle}>Grupo muscular</Text>
              <Text style={styles.muscleText}>{routine.muscle}</Text>
            </View>
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.metadataContainer}>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(routine.difficulty) }]}>
            <Text style={styles.difficultyText}>{routine.difficulty}</Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{routine.category}</Text>
          </View>
        </View>

        {/* Exercises List */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>Ejercicios incluidos</Text>
          <Text style={styles.sectionSubtitle}>
            Estos son los ejercicios que componen esta rutina recomendada
          </Text>
          
          <View style={styles.exercisesList}>
            {(routine.exercises || []).map((exercise, index) => (
              <View key={exercise.id || `exercise-${index}`} style={styles.exerciseItem}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>
                    {typeof exercise === 'string' ? exercise : exercise.name}
                  </Text>
                  <Text style={styles.exerciseNote}>
                    {typeof exercise === 'object' && exercise.equipment 
                      ? `Equipamiento: ${exercise.equipment}`
                      : routine.category === 'Sin equipo' 
                        ? 'Sin equipamiento' 
                        : 'Equipamiento requerido'
                    }
                  </Text>
                  {typeof exercise === 'object' && exercise.muscle && (
                    <Text style={[styles.exerciseNote, { color: colors.primary, fontSize: 11 }]}>
                      Grupo muscular: {exercise.muscle}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            ))}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Beneficios de esta rutina</Text>
          <View style={styles.benefitsList}>
            {routine.category === 'Músculo específico' && (
              <View style={styles.benefitItem}>
                <Ionicons name="fitness" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Fortalecimiento específico del {routine.muscle.toLowerCase()}</Text>
              </View>
            )}
            {routine.category === 'Sin equipo' && (
              <View style={styles.benefitItem}>
                <Ionicons name="home" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Entrena desde cualquier lugar sin equipamiento</Text>
              </View>
            )}
            {routine.category === 'Cardio' && (
              <View style={styles.benefitItem}>
                <Ionicons name="heart" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Mejora la resistencia cardiovascular</Text>
              </View>
            )}
            <View style={styles.benefitItem}>
              <Ionicons name="time" size={20} color={colors.success} />
              <Text style={styles.benefitText}>Duración optimizada de {routine.estimatedTime}</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
              <Text style={styles.benefitText}>Nivel {routine.difficulty.toLowerCase()} - progresión adecuada</Text>
            </View>
          </View>
        </View>

        {/* Beta Notice */}
        <View style={styles.betaNotice}>
          <View style={styles.betaNoticeHeader}>
            <Ionicons name="information-circle" size={20} color={colors.warning} />
            <Text style={styles.betaNoticeTitle}>Versión Beta</Text>
          </View>
          <Text style={styles.betaNoticeText}>
            Esta rutina es una recomendación para inspirarte. Puedes encontrar ejercicios similares 
            en tu biblioteca para crear tu propio entrenamiento personalizado.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity 
          style={styles.findExercisesButton}
          onPress={handleFindExercises}
        >
          <Ionicons name="search" size={20} color={colors.background} />
          <Text style={styles.findExercisesButtonText}>Buscar Ejercicios Similares</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.background,
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  routineIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  routineHeaderInfo: {
    flex: 1,
  },
  routineName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  routineDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  statsContainer: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    ...globalStyles.shadow,
  },
  // Card completa para el grupo muscular
  muscleCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...globalStyles.shadow,
  },
  muscleInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  muscleTitle: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  muscleText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  statNumber: {
    ...typography.h4,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
  metadataContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  difficultyText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  exercisesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  exercisesList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.background,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...typography.body,
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseNote: {
    ...typography.small,
    color: colors.textMuted,
  },
  benefitsSection: {
    marginBottom: spacing.xl,
  },
  benefitsList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  benefitText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  betaNotice: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    marginBottom: spacing.md,
  },
  betaNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  betaNoticeTitle: {
    ...typography.body,
    fontWeight: '600',
    marginLeft: spacing.sm,
    color: colors.warning,
  },
  betaNoticeText: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  bottomActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  findExercisesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    ...globalStyles.shadow,
  },
  findExercisesButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});

export default RoutineDetail;
