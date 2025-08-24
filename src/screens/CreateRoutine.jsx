import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';
import { useAuth } from '../contexts/AuthContext';
import { RoutineService } from '../services/routineService';
import { getAllExercises, searchExercises } from '../services/exerciseApi';

const CreateRoutine = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const editingRoutine = route.params?.routine;
  const isEditing = !!editingRoutine;

  // Estados principales
  const [routineName, setRoutineName] = useState(editingRoutine?.name || '');
  const [routineDescription, setRoutineDescription] = useState(editingRoutine?.description || '');
  const [selectedExercises, setSelectedExercises] = useState(editingRoutine?.exercises || []);
  const [category, setCategory] = useState(editingRoutine?.category || 'Personalizada');
  const [estimatedTime, setEstimatedTime] = useState(editingRoutine?.estimatedTime?.replace(' min', '') || '45');
  const [difficulty, setDifficulty] = useState(editingRoutine?.difficulty || 'Intermedio');
  
  // Estados para búsqueda de ejercicios
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados adicionales para mejor UX
  const [focusedField, setFocusedField] = useState(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (showExerciseSelector) {
      loadExercises();
    }
  }, [showExerciseSelector]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const exercises = await getAllExercises();
      setAvailableExercises(exercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
      Alert.alert('Error', 'No se pudieron cargar los ejercicios');
    } finally {
      setLoading(false);
    }
  };

  const searchExercisesHandler = async (query) => {
    if (!query.trim()) {
      setAvailableExercises(await getAllExercises());
      return;
    }

    try {
      setLoading(true);
      const results = await searchExercises(query);
      setAvailableExercises(results);
    } catch (error) {
      console.error('Error searching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const addExercise = (exercise) => {
    if (selectedExercises.find(ex => ex.id === exercise.id)) {
      Alert.alert('Ejercicio ya agregado', 'Este ejercicio ya está en tu rutina');
      return;
    }

    setSelectedExercises([...selectedExercises, exercise]);
    Alert.alert('Ejercicio agregado', `${exercise.name} se agregó a la rutina`);
  };

  const removeExercise = (exerciseId) => {
    Alert.alert(
      'Remover ejercicio',
      '¿Estás seguro de que quieres remover este ejercicio de la rutina?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setSelectedExercises(selectedExercises.filter(ex => ex.id !== exerciseId));
          }
        }
      ]
    );
  };

  const moveExercise = (index, direction) => {
    const newExercises = [...selectedExercises];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newExercises.length) {
      [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];
      setSelectedExercises(newExercises);
    }
  };

  const validateRoutine = () => {
    if (!routineName.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la rutina');
      return false;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Agrega al menos un ejercicio a la rutina');
      return false;
    }

    if (selectedExercises.length < 3) {
      Alert.alert('Advertencia', 'Se recomienda tener al menos 3 ejercicios en una rutina');
    }

    return true;
  };

  const saveRoutine = async () => {
    if (!validateRoutine()) return;

    try {
      setSaving(true);

      const routineData = {
        id: isEditing ? editingRoutine.id : 'custom_' + Date.now(),
        name: routineName.trim(),
        description: routineDescription.trim() || `Rutina personalizada con ${selectedExercises.length} ejercicios`,
        category,
        difficulty,
        estimatedTime: estimatedTime + ' min',
        totalExercises: selectedExercises.length,
        muscle: getMuscleGroups(),
        exercises: selectedExercises,
        workoutPlan: createWorkoutPlan(),
        tags: ['personalizada', 'custom', difficulty.toLowerCase()],
        featured: false,
        isCustom: true,
        isGenerated: false,
        createdAt: isEditing ? editingRoutine.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isEditing) {
        await RoutineService.updateRoutine(user.uid, editingRoutine.id, routineData);
        Alert.alert('¡Éxito!', 'Rutina actualizada correctamente', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await RoutineService.saveRoutine(user.uid, routineData);
        Alert.alert('¡Éxito!', 'Rutina creada correctamente', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }

    } catch (error) {
      console.error('Error saving routine:', error);
      Alert.alert('Error', 'No se pudo guardar la rutina. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const getMuscleGroups = () => {
    const muscles = new Set();
    selectedExercises.forEach(exercise => {
      if (exercise.muscle) muscles.add(exercise.muscle);
      if (exercise.primaryMuscles) {
        exercise.primaryMuscles.forEach(m => muscles.add(m));
      }
    });
    return Array.from(muscles).slice(0, 3).join(', ') || 'Varios grupos';
  };

  const createWorkoutPlan = () => {
    const sets = difficulty === 'Principiante' ? 3 : difficulty === 'Intermedio' ? 4 : 5;
    const reps = difficulty === 'Principiante' ? '12-15' : difficulty === 'Intermedio' ? '8-12' : '6-10';
    const restTime = difficulty === 'Principiante' ? '90s' : difficulty === 'Intermedio' ? '60s' : '45s';

    return {
      warmup: '5-10 minutos de calentamiento dinámico',
      exercises: selectedExercises.map((exercise, index) => ({
        ...exercise,
        sets,
        reps,
        restTime,
        order: index + 1
      })),
      cooldown: '5-10 minutos de estiramiento'
    };
  };

  // Estilos memoizados para evitar re-renders innecesarios
  const getInputWrapperStyle = useMemo(() => {
    return (fieldName) => [
      styles.modernInputWrapper,
      focusedField === fieldName && styles.modernInputWrapperFocused
    ];
  }, [focusedField]);

  const getTextAreaWrapperStyle = useMemo(() => {
    return [
      styles.modernInputWrapper,
      styles.textAreaWrapper,
      focusedField === 'description' && styles.modernInputWrapperFocused
    ];
  }, [focusedField]);

  // Manejo del foco optimizado para evitar bucles infinitos
  const handleFocus = useCallback((field) => {
    setFocusedField(field);
  }, []);

  const handleBlur = useCallback(() => {
    // Usar un pequeño delay para evitar parpadeos al cambiar entre campos
    setTimeout(() => {
      setFocusedField(null);
    }, 150);
  }, []);

  // Opciones para selectores
  const difficultyOptions = [
    { value: 'Principiante', label: 'Principiante', description: '3 series • 12-15 reps • 90s descanso', icon: 'leaf' },
    { value: 'Intermedio', label: 'Intermedio', description: '4 series • 8-12 reps • 60s descanso', icon: 'fitness' },
    { value: 'Avanzado', label: 'Avanzado', description: '5 series • 6-10 reps • 45s descanso', icon: 'flame' },
  ];

  const categoryOptions = [
    { value: 'Personalizada', label: 'Personalizada', description: 'Rutina creada por ti', icon: 'person' },
    { value: 'Fuerza', label: 'Fuerza', description: 'Enfoque en ganar fuerza', icon: 'barbell' },
    { value: 'Resistencia', label: 'Resistencia', description: 'Mejora tu resistencia', icon: 'timer' },
    { value: 'Cardio', label: 'Cardio', description: 'Ejercicios cardiovasculares', icon: 'heart' },
  ];

  // Renderizar modal de selección
  const renderSelectionModal = (visible, onClose, options, currentValue, onSelect, title) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalOptions} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  currentValue === option.value && styles.modalOptionSelected
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <View style={styles.modalOptionContent}>
                  <View style={[
                    styles.modalOptionIcon,
                    currentValue === option.value && styles.modalOptionIconSelected
                  ]}>
                    <Ionicons 
                      name={option.icon} 
                      size={20} 
                      color={currentValue === option.value ? colors.background : colors.primary} 
                    />
                  </View>
                  <View style={styles.modalOptionText}>
                    <Text style={[
                      styles.modalOptionLabel,
                      currentValue === option.value && styles.modalOptionLabelSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.modalOptionDescription}>
                      {option.description}
                    </Text>
                  </View>
                </View>
                {currentValue === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );

  const filteredExercises = availableExercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showExerciseSelector) {
    return (
      <View style={globalStyles.container}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowExerciseSelector(false)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agregar Ejercicios</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ejercicios..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchExercisesHandler(text);
              }}
            />
          </View>
        </View>

        {/* Exercise List */}
        <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando ejercicios...</Text>
            </View>
          ) : (
            filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseItem}
                onPress={() => addExercise(exercise)}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseItemName}>{exercise.name}</Text>
                  <Text style={styles.exerciseItemMuscle}>{exercise.muscle}</Text>
                  <Text style={styles.exerciseItemEquipment}>{exercise.equipment}</Text>
                </View>
                <View style={styles.addButton}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <>
      {/* Modales de selección */}
      {renderSelectionModal(
        showDifficultyModal,
        () => setShowDifficultyModal(false),
        difficultyOptions,
        difficulty,
        setDifficulty,
        'Seleccionar Dificultad'
      )}
      
      {renderSelectionModal(
        showCategoryModal,
        () => setShowCategoryModal(false),
        categoryOptions,
        category,
        setCategory,
        'Seleccionar Categoría'
      )}

    <View style={globalStyles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Rutina' : 'Crear Rutina'}
        </Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveRoutine}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Actualizar' : 'Guardar'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {/* Basic Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="create" size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Información Básica</Text>
          </View>
          
          {/* Nombre de rutina */}
          <View style={styles.modernInputContainer}>
            <Text style={styles.modernInputLabel}>Nombre de la rutina *</Text>
            <View style={getInputWrapperStyle('name')}>
              <Ionicons name="fitness" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.modernTextInput}
                placeholder="Ej: Mi rutina de pecho"
                placeholderTextColor={colors.textMuted}
                value={routineName}
                onChangeText={setRoutineName}
                onFocus={() => handleFocus('name')}
                onBlur={handleBlur}
                maxLength={50}
              />
            </View>
            <Text style={styles.characterCounter}>{routineName.length}/50</Text>
          </View>

          {/* Descripción */}
          <View style={styles.modernInputContainer}>
            <Text style={styles.modernInputLabel}>Descripción</Text>
            <View style={getTextAreaWrapperStyle}>
              <View style={styles.textAreaIconContainer}>
                <Ionicons name="document-text" size={20} color={colors.textMuted} />
              </View>
              <TextInput
                style={[styles.modernTextInput, styles.textAreaInput]}
                placeholder="Describe tu rutina..."
                placeholderTextColor={colors.textMuted}
                value={routineDescription}
                onChangeText={setRoutineDescription}
                onFocus={() => handleFocus('description')}
                onBlur={handleBlur}
                multiline
                numberOfLines={3}
                maxLength={200}
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.characterCounter}>{routineDescription.length}/200</Text>
          </View>

          {/* Selectores modernos */}
          <View style={styles.selectorRow}>
            <View style={styles.selectorContainer}>
              <Text style={styles.modernInputLabel}>Categoría</Text>
              <TouchableOpacity 
                style={styles.modernSelector}
                onPress={() => setShowCategoryModal(true)}
              >
                <View style={styles.selectorContent}>
                  <Ionicons name="grid" size={20} color={colors.primary} />
                  <View style={styles.selectorTextContainer}>
                    <Text style={styles.selectorText}>{category}</Text>
                    <Text style={styles.selectorSubtext}>Tipo de rutina</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.selectorContainer}>
              <Text style={styles.modernInputLabel}>Dificultad</Text>
              <TouchableOpacity 
                style={styles.modernSelector}
                onPress={() => setShowDifficultyModal(true)}
              >
                <View style={styles.selectorContent}>
                  <Ionicons 
                    name={difficulty === 'Principiante' ? 'leaf' : difficulty === 'Intermedio' ? 'fitness' : 'flame'} 
                    size={20} 
                    color={colors.primary} 
                  />
                  <View style={styles.selectorTextContainer}>
                    <Text style={styles.selectorText}>{difficulty}</Text>
                    <Text style={styles.selectorSubtext}>Nivel de intensidad</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Duración */}
          <View style={styles.modernInputContainer}>
            <Text style={styles.modernInputLabel}>Duración estimada</Text>
            <View style={getInputWrapperStyle('time')}>
              <Ionicons name="timer" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.modernTextInput}
                placeholder="45"
                placeholderTextColor={colors.textMuted}
                value={estimatedTime}
                onChangeText={setEstimatedTime}
                onFocus={() => handleFocus('time')}
                onBlur={handleBlur}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.inputSuffix}>min</Text>
            </View>
          </View>
        </View>

        {/* Exercises Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="fitness-center" size={20} color={colors.primary} />
            </View>
            <View style={styles.exerciseHeaderContent}>
              <Text style={styles.sectionTitle}>
                Ejercicios
              </Text>
              <Text style={styles.exerciseCount}>
                {selectedExercises.length} {selectedExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.modernAddButton}
              onPress={() => setShowExerciseSelector(true)}
            >
              <Ionicons name="add" size={24} color={colors.background} />
            </TouchableOpacity>
          </View>

          {selectedExercises.length === 0 ? (
            <View style={styles.modernEmptyState}>
              <View style={styles.emptyStateIcon}>
                <MaterialIcons name="fitness-center" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>No hay ejercicios agregados</Text>
              <Text style={styles.emptyStateDescription}>
                Toca el botón + para agregar ejercicios a tu rutina personalizada
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setShowExerciseSelector(true)}
              >
                <Ionicons name="add" size={20} color={colors.background} />
                <Text style={styles.emptyStateButtonText}>Agregar Ejercicio</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.modernExercisesList}>
              {selectedExercises.map((exercise, index) => (
                <Animated.View 
                  key={exercise.id} 
                  style={[
                    styles.modernExerciseItem,
                    { opacity: fadeAnim }
                  ]}
                >
                  <View style={styles.exerciseItemHeader}>
                    <View style={styles.modernExerciseNumber}>
                      <Text style={styles.modernExerciseNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.modernExerciseInfo}>
                      <Text style={styles.modernExerciseName}>{exercise.name}</Text>
                      <Text style={styles.modernExerciseMuscle}>{exercise.muscle}</Text>
                      {exercise.equipment && (
                        <View style={styles.equipmentTag}>
                          <Ionicons name="barbell" size={12} color={colors.primary} />
                          <Text style={styles.equipmentText}>{exercise.equipment}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.modernExerciseActions}>
                    <TouchableOpacity 
                      style={[styles.modernActionButton, index === 0 && styles.disabledActionButton]}
                      onPress={() => moveExercise(index, 'up')}
                      disabled={index === 0}
                    >
                      <Ionicons 
                        name="chevron-up" 
                        size={18} 
                        color={index === 0 ? colors.textMuted : colors.primary} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.modernActionButton, 
                        index === selectedExercises.length - 1 && styles.disabledActionButton
                      ]}
                      onPress={() => moveExercise(index, 'down')}
                      disabled={index === selectedExercises.length - 1}
                    >
                      <Ionicons 
                        name="chevron-down" 
                        size={18} 
                        color={index === selectedExercises.length - 1 ? colors.textMuted : colors.primary} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modernActionButton, styles.removeActionButton]}
                      onPress={() => removeExercise(exercise.id)}
                    >
                      <Ionicons name="trash" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        {/* Summary */}
        {selectedExercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <MaterialIcons name="fitness-center" size={20} color={colors.primary} />
                <Text style={styles.summaryText}>
                  {selectedExercises.length} ejercicios
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={styles.summaryText}>{estimatedTime} minutos</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="body" size={20} color={colors.primary} />
                <Text style={styles.summaryText}>{getMuscleGroups()}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
    </>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  addExerciseButtonText: {
    color: colors.background,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyStateSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  exercisesList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseOrder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  exerciseOrderText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 14,
  },
  exerciseDetails: {
    flex: 1,
  },
  selectedExerciseName: {
    ...typography.body,
    fontWeight: '500',
    marginBottom: 2,
  },
  selectedExerciseMuscle: {
    ...typography.small,
    color: colors.textMuted,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  disabledButton: {
    backgroundColor: colors.surface,
  },
  removeButton: {
    backgroundColor: colors.surface,
  },
  summaryContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryText: {
    ...typography.body,
    marginLeft: spacing.sm,
    color: colors.textSecondary,
  },
  
  // Exercise Selector Styles
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },
  exerciseList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseItemName: {
    ...typography.body,
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseItemMuscle: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: 2,
  },
  exerciseItemEquipment: {
    ...typography.small,
    color: colors.textSecondary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nuevos estilos modernos
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  modernInputContainer: {
    marginBottom: spacing.lg,
  },
  modernInputLabel: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  modernInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 56,
  },
  modernInputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    // Mantener la consistencia con el borderWidth existente
    borderWidth: 2,
  },
  modernTextInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    minHeight: 96,
  },
  textAreaIconContainer: {
    paddingTop: spacing.xs,
  },
  textAreaInput: {
    marginTop: 0,
    textAlignVertical: 'top',
    minHeight: 64,
  },
  inputSuffix: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '500',
  },
  characterCounter: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  selectorContainer: {
    flex: 0.48,
  },
  modernSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 64,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  selectorText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  selectorSubtext: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Estilos para modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h4,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  modalOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modalOptionIconSelected: {
    backgroundColor: colors.primary,
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalOptionLabelSelected: {
    color: colors.primary,
  },
  modalOptionDescription: {
    ...typography.small,
    color: colors.textMuted,
  },

  // Estilos para ejercicios modernos
  exerciseHeaderContent: {
    flex: 1,
  },
  exerciseCount: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  modernAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  emptyStateDescription: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: colors.background,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  modernExercisesList: {
    backgroundColor: 'transparent',
  },
  modernExerciseItem: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  exerciseItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modernExerciseNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modernExerciseNumberText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modernExerciseInfo: {
    flex: 1,
  },
  modernExerciseName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  modernExerciseMuscle: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  equipmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  equipmentText: {
    ...typography.small,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  modernExerciseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modernActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledActionButton: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  removeActionButton: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error + '40',
  },
});

export default CreateRoutine;
