import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';
import { useAuth } from '../contexts/AuthContext';
import { RoutineService } from '../services/routineService';
import { FormValidationExample } from '../utils/validation';

const WorkoutTracker = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { routine } = route.params;
  
  // Estados principales
  const [workoutStartTime, setWorkoutStartTime] = useState(new Date());
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseData, setExerciseData] = useState([]);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showSetModal, setShowSetModal] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Estados del modal de sets
  const [currentSet, setCurrentSet] = useState(1);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  useEffect(() => {
    initializeWorkout();
  }, []);

  useEffect(() => {
    let interval;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setIsResting(false);
            Alert.alert('¡Descanso terminado!', 'Es hora del siguiente set');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const initializeWorkout = () => {
    // Inicializar datos de ejercicios basado en el plan de entrenamiento
    const workoutPlan = routine.workoutPlan || createDefaultWorkoutPlan();
    
    const initialData = workoutPlan.exercises.map((exercise, index) => ({
      ...exercise,
      completed: false,
      sets: [],
      currentSet: 1,
      totalSets: parseInt(exercise.sets) || 3,
      targetReps: exercise.reps || '8-12',
      restTime: parseInt(exercise.restTime) || 60,
    }));

    setExerciseData(initialData);
    setIsWorkoutActive(true);
  };

  const createDefaultWorkoutPlan = () => {
    return {
      exercises: routine.exercises.map((exercise, index) => ({
        ...exercise,
        sets: 3,
        reps: '8-12',
        restTime: '60s',
        order: index + 1
      }))
    };
  };

  const startRestTimer = (seconds) => {
    setRestTimer(seconds);
    setIsResting(true);
  };

  const completeSet = () => {
    // Validar los datos del set
    const validation = FormValidationExample.workoutSet(weight, reps);
    
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).join('\n');
      Alert.alert('Datos incorrectos', errorMessages);
      return;
    }

    const currentExercise = exerciseData[currentExerciseIndex];
    const newSet = {
      set: currentSet,
      weight: validation.values.weight,
      reps: validation.values.reps,
      timestamp: new Date().toISOString()
    };

    const updatedExerciseData = [...exerciseData];
    updatedExerciseData[currentExerciseIndex].sets.push(newSet);
    
    // Verificar si completó todos los sets del ejercicio
    const totalSets = updatedExerciseData[currentExerciseIndex].totalSets;
    if (currentSet >= totalSets) {
      updatedExerciseData[currentExerciseIndex].completed = true;
      Alert.alert(
        '¡Ejercicio completado!',
        `Has terminado ${currentExercise.name}`,
        [
          {
            text: 'Siguiente ejercicio',
            onPress: () => moveToNextExercise()
          }
        ]
      );
    } else {
      // Iniciar descanso automático
      const restTime = updatedExerciseData[currentExerciseIndex].restTime;
      startRestTimer(restTime);
      setCurrentSet(currentSet + 1);
    }

    setExerciseData(updatedExerciseData);
    setShowSetModal(false);
    setWeight('');
    setReps('');
  };

  const moveToNextExercise = () => {
    if (currentExerciseIndex < exerciseData.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
    } else {
      // Workout completado
      completeWorkout();
    }
  };

  const moveToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      const prevExercise = exerciseData[currentExerciseIndex - 1];
      setCurrentSet(prevExercise.sets.length + 1);
    }
  };

  const skipRestTimer = () => {
    setIsResting(false);
    setRestTimer(0);
  };

  const completeWorkout = async () => {
    try {
      Alert.alert(
        '¡Entrenamiento completado! 🎉',
        '¿Cómo te fue en este entrenamiento?',
        [
          {
            text: 'Muy bien',
            onPress: () => finalizeWorkout('excellent')
          },
          {
            text: 'Bien',
            onPress: () => finalizeWorkout('good')
          },
          {
            text: 'Regular',
            onPress: () => finalizeWorkout('okay')
          }
        ]
      );
    } catch (error) {
      console.error('Error completing workout:', error);
    }
  };

  const finalizeWorkout = async (rating) => {
    try {
      // Marcar rutina como completada
      await RoutineService.markRoutineCompleted(user.uid, routine.id);
      
      // Calcular estadísticas del entrenamiento
      const workoutDuration = Math.floor((new Date() - workoutStartTime) / 60000); // en minutos
      const totalSets = exerciseData.reduce((sum, ex) => sum + ex.sets.length, 0);
      const totalReps = exerciseData.reduce((sum, ex) => 
        sum + ex.sets.reduce((setSum, set) => setSum + set.reps, 0), 0
      );
      const totalVolume = exerciseData.reduce((sum, ex) => 
        sum + ex.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0), 0
      );

      const workoutSummary = {
        routine: routine.name,
        duration: workoutDuration,
        totalSets,
        totalReps,
        totalVolume,
        rating,
        exercises: exerciseData.length,
        notes: workoutNotes
      };

      // Mostrar resumen y navegar de vuelta
      navigation.replace('WorkoutSummary', { 
        summary: workoutSummary,
        routine,
        exerciseData 
      });

    } catch (error) {
      console.error('Error finalizing workout:', error);
      Alert.alert('Error', 'Hubo un problema al guardar el entrenamiento');
    }
  };

  const cancelWorkout = () => {
    Alert.alert(
      'Cancelar Entrenamiento',
      '¿Estás seguro de que quieres cancelar? Se perderá el progreso actual.',
      [
        { text: 'Continuar entrenando', style: 'cancel' },
        { 
          text: 'Cancelar entrenamiento', 
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWorkoutDuration = () => {
    if (!isWorkoutActive) return '0:00';
    const duration = Math.floor((new Date() - workoutStartTime) / 1000);
    return formatTime(duration);
  };

  const currentExercise = exerciseData[currentExerciseIndex];
  
  if (!currentExercise) return null;

  const completedExercises = exerciseData.filter(ex => ex.completed).length;
  const progress = (completedExercises / exerciseData.length) * 100;

  return (
    <View style={globalStyles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={cancelWorkout}
        >
          <Ionicons name="close" size={24} color={colors.error} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.routineName}>{routine.name}</Text>
          <Text style={styles.workoutTime}>{getWorkoutDuration()}</Text>
        </View>
        
        <TouchableOpacity style={styles.notesButton}>
          <Feather name="edit-3" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {completedExercises}/{exerciseData.length} ejercicios
        </Text>
      </View>

      {/* Rest Timer */}
      {isResting && (
        <View style={styles.restTimer}>
          <View style={styles.restTimerContent}>
            <Text style={styles.restTimerTitle}>Descansando</Text>
            <Text style={styles.restTimerTime}>{formatTime(restTimer)}</Text>
            <TouchableOpacity 
              style={styles.skipRestButton}
              onPress={skipRestTimer}
            >
              <Text style={styles.skipRestButtonText}>Saltar descanso</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Exercise */}
        <View style={styles.currentExerciseContainer}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>
                {currentExerciseIndex + 1}
              </Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              <Text style={styles.exerciseMuscle}>{currentExercise.muscle}</Text>
            </View>
          </View>

          {/* Target Info */}
          <View style={styles.targetInfo}>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Sets</Text>
              <Text style={styles.targetValue}>{currentExercise.totalSets}</Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Reps</Text>
              <Text style={styles.targetValue}>{currentExercise.targetReps}</Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Descanso</Text>
              <Text style={styles.targetValue}>{currentExercise.restTime}s</Text>
            </View>
          </View>

          {/* Sets Completed */}
          <View style={styles.setsContainer}>
            <Text style={styles.setsTitle}>Sets completados:</Text>
            {currentExercise.sets.length === 0 ? (
              <Text style={styles.noSetsText}>Ningún set completado aún</Text>
            ) : (
              currentExercise.sets.map((set, index) => (
                <View key={index} style={styles.completedSet}>
                  <Text style={styles.setNumber}>Set {set.set}</Text>
                  <Text style={styles.setData}>{set.weight}kg × {set.reps}</Text>
                </View>
              ))
            )}
          </View>

          {/* Current Set */}
          <View style={styles.currentSetContainer}>
            <Text style={styles.currentSetTitle}>
              Set {currentSet} de {currentExercise.totalSets}
            </Text>
            <TouchableOpacity 
              style={styles.recordSetButton}
              onPress={() => setShowSetModal(true)}
              disabled={currentExercise.completed}
            >
              <MaterialIcons name="add-circle" size={24} color={colors.background} />
              <Text style={styles.recordSetButtonText}>
                {currentExercise.completed ? 'Ejercicio completado' : 'Registrar set'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity 
            style={[styles.navButton, currentExerciseIndex === 0 && styles.disabledButton]}
            onPress={moveToPreviousExercise}
            disabled={currentExerciseIndex === 0}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
            <Text style={styles.navButtonText}>Anterior</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, !currentExercise.completed && styles.disabledButton]}
            onPress={moveToNextExercise}
            disabled={!currentExercise.completed}
          >
            <Text style={styles.navButtonText}>
              {currentExerciseIndex === exerciseData.length - 1 ? 'Finalizar' : 'Siguiente'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Exercise List Overview */}
        <View style={styles.exerciseOverview}>
          <Text style={styles.overviewTitle}>Progreso general</Text>
          {exerciseData.map((exercise, index) => (
            <View 
              key={index}
              style={[
                styles.exerciseOverviewItem,
                index === currentExerciseIndex && styles.currentExerciseOverview
              ]}
            >
              <Text style={styles.overviewExerciseName}>{exercise.name}</Text>
              <View style={styles.overviewProgress}>
                <Text style={styles.overviewSets}>
                  {exercise.sets.length}/{exercise.totalSets} sets
                </Text>
                {exercise.completed && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Set Recording Modal */}
      <Modal
        visible={showSetModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Registrar Set {currentSet}
            </Text>
            <Text style={styles.modalSubtitle}>
              {currentExercise.name}
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Peso (kg)</Text>
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Repeticiones</Text>
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowSetModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={completeSet}
              >
                <Text style={styles.modalSaveButtonText}>Guardar Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  routineName: {
    ...typography.h4,
    textAlign: 'center',
  },
  workoutTime: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  notesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  restTimer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restTimerContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 200,
  },
  restTimerTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  restTimerTime: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  skipRestButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  skipRestButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  currentExerciseContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exerciseNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  exerciseNumberText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 18,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  exerciseMuscle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  targetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  targetItem: {
    alignItems: 'center',
  },
  targetLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  targetValue: {
    ...typography.h4,
    color: colors.primary,
  },
  setsContainer: {
    marginBottom: spacing.lg,
  },
  setsTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  noSetsText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.md,
  },
  completedSet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  setNumber: {
    ...typography.body,
    color: colors.textSecondary,
  },
  setData: {
    ...typography.body,
    fontWeight: '600',
  },
  currentSetContainer: {
    alignItems: 'center',
  },
  currentSetTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  recordSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
  },
  recordSetButtonText: {
    color: colors.background,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    flex: 0.45,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginHorizontal: spacing.xs,
  },
  exerciseOverview: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  overviewTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  exerciseOverviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  currentExerciseOverview: {
    backgroundColor: colors.primary + '20',
  },
  overviewExerciseName: {
    ...typography.body,
    flex: 1,
  },
  overviewProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewSets: {
    ...typography.small,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flex: 0.45,
  },
  inputLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  setInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 0.45,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 0.45,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  modalSaveButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
});

export default WorkoutTracker;
