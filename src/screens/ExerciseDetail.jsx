import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';
import { getExerciseById } from '../services/exerciseApi';

const { width } = Dimensions.get('window');

const ExerciseDetail = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { exercise: initialExercise } = route.params;
  const [exercise, setExercise] = useState(initialExercise);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // Log para debugging: ver la estructura del ejercicio inicial
    console.log('🔍 Estructura del ejercicio inicial:', {
      id: initialExercise?.id,
      name: initialExercise?.name,
      instructions: initialExercise?.instructions,
      instructionsType: typeof initialExercise?.instructions,
      isArray: Array.isArray(initialExercise?.instructions),
      primaryMuscles: initialExercise?.primaryMuscles,
      primaryMusclesType: typeof initialExercise?.primaryMuscles,
      primaryMusclesIsArray: Array.isArray(initialExercise?.primaryMuscles)
    });

    // Si tenemos datos iniciales, intentar obtener más detalles de la API
    if (initialExercise?.id) {
      loadExerciseDetails();
    }
  }, [initialExercise?.id]);

  const loadExerciseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔍 Cargando detalles para ejercicio ID: ${initialExercise.id}`);
      
      const detailedExercise = await getExerciseById(initialExercise.id);
      
      if (detailedExercise) {
        console.log(`✅ Detalles cargados para: ${detailedExercise.name}`);
        setExercise(detailedExercise);
      } else {
        console.log('⚠️ No se encontraron detalles adicionales, usando datos iniciales');
      }
    } catch (error) {
      console.error('❌ Error loading exercise details:', error);
      setError(error.message);
      // Mantener los datos iniciales si falla la carga
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implementar lógica de favoritos en AsyncStorage o backend
  };

  const addToRoutine = () => {
    Alert.alert(
      'Añadir a Rutina',
      '¿A qué rutina quieres añadir este ejercicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Crear Nueva Rutina', onPress: () => console.log('Create new routine') },
        { text: 'Rutina Actual', onPress: () => console.log('Add to current routine') },
      ]
    );
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Principiante':
      case 'beginner': 
        return colors.success;
      case 'Intermedio':
      case 'intermediate': 
        return colors.warning;
      case 'Avanzado':
      case 'expert': 
        return colors.error;
      default: 
        return colors.textMuted;
    }
  };

  const formatDifficulty = (difficulty) => {
    const difficultyMap = {
      'beginner': 'Principiante',
      'intermediate': 'Intermedio', 
      'expert': 'Avanzado'
    };
    return difficultyMap[difficulty] || difficulty;
  };

  const formatCategory = (category) => {
    const categoryMap = {
      'cardio': 'Cardio',
      'olympic_weightlifting': 'Levantamiento Olímpico',
      'plyometrics': 'Pliometría',
      'powerlifting': 'Powerlifting',
      'strength': 'Fuerza',
      'stretching': 'Estiramiento',
      'strongman': 'Strongman'
    };
    return categoryMap[category] || category;
  };

  const formatEquipment = (equipment) => {
    const equipmentMap = {
      'body_only': 'Solo Cuerpo',
      'machine': 'Máquina',
      'other': 'Otro',
      'foam_roll': 'Rodillo de Espuma',
      'kettlebells': 'Kettlebells',
      'dumbbell': 'Mancuernas',
      'cable': 'Cable',
      'barbell': 'Barra',
      'bands': 'Bandas',
      'medicine_ball': 'Pelota Medicinal',
      'exercise_ball': 'Pelota de Ejercicio',
      'e_z_curl_bar': 'Barra EZ'
    };
    return equipmentMap[equipment] || equipment;
  };

  const renderMuscleChip = (muscle, isPrimary = false) => {
    // Validar que muscle existe y no es undefined
    if (!muscle) return null;
    
    return (
      <View 
        key={muscle}
        style={[
          styles.muscleChip,
          isPrimary ? styles.primaryMuscleChip : styles.secondaryMuscleChip
        ]}
      >
        <Text style={[
          styles.muscleChipText,
          isPrimary ? styles.primaryMuscleText : styles.secondaryMuscleText
        ]}>
          {muscle}
        </Text>
      </View>
    );
  };

  const renderInstructionItem = (instruction, index) => {
    // Validar que instruction existe y no es undefined
    if (!instruction) return null;
    
    return (
      <View key={index} style={styles.instructionItem}>
        <View style={styles.instructionNumber}>
          <Text style={styles.instructionNumberText}>{index + 1}</Text>
        </View>
        <Text style={styles.instructionText}>{instruction}</Text>
      </View>
    );
  };

  return (
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
        
        <Text style={styles.headerTitle} numberOfLines={1}>
          {exercise.name}
        </Text>
        {/* Placeholder to center title */}
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Image/GIF */}
        <View style={styles.mediaContainer}>
          {exercise.images && exercise.images.length > 0 ? (
            <Image 
              source={{ uri: exercise.images[0] }} 
              style={styles.exerciseImage}
              resizeMode="contain"
              onError={(error) => {
                console.log('❌ Error cargando imagen:', error.nativeEvent.error);
              }}
              onLoad={() => {
                console.log('✅ Imagen cargada exitosamente para:', exercise.name);
              }}
            />
          ) : exercise.image ? (
            <Image 
              source={{ uri: exercise.image }} 
              style={styles.exerciseImage}
              resizeMode="contain"
              onError={(error) => {
                console.log('❌ Error cargando imagen:', error.nativeEvent.error);
              }}
              onLoad={() => {
                console.log('✅ Imagen cargada exitosamente para:', exercise.name);
              }}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <MaterialIcons 
                name="fitness-center" 
                size={64} 
                color={colors.primary} 
              />
              <Text style={styles.placeholderText}>
                {formatCategory(exercise.category || exercise.force || 'Ejercicio')}
              </Text>
            </View>
          )}
          
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando detalles...</Text>
            </View>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={24} color={colors.error} />
            <Text style={styles.errorText}>
              Error al cargar detalles: {error}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadExerciseDetails}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Exercise Info */}
        <View style={styles.content}>
          {/* Basic Info */}
          <View style={styles.basicInfoContainer}>
            <View style={styles.infoRow}>
              <MaterialIcons name="fitness-center" size={20} color={colors.primary} />
              <Text style={styles.infoLabel}>Equipamiento:</Text>
              <Text style={styles.infoValue}>{formatEquipment(exercise.equipment)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="body" size={20} color={colors.primary} />
              <Text style={styles.infoLabel}>Categoría:</Text>
              <Text style={styles.infoValue}>{formatCategory(exercise.category)}</Text>
            </View>

            {exercise.force && (
              <View style={styles.infoRow}>
                <MaterialIcons name="power" size={20} color={colors.primary} />
                <Text style={styles.infoLabel}>Tipo de Fuerza:</Text>
                <Text style={styles.infoValue}>{exercise.force}</Text>
              </View>
            )}

            {exercise.level && (
              <View style={styles.infoRow}>
                <MaterialIcons name="signal-cellular-alt" size={20} color={colors.primary} />
                <Text style={styles.infoLabel}>Dificultad:</Text>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(exercise.level) }]}>
                  <Text style={styles.difficultyText}>{formatDifficulty(exercise.level)}</Text>
                </View>
              </View>
            )}

            {exercise.mechanic && (
              <View style={styles.infoRow}>
                <MaterialIcons name="settings" size={20} color={colors.primary} />
                <Text style={styles.infoLabel}>Mecánica:</Text>
                <Text style={styles.infoValue}>{exercise.mechanic}</Text>
              </View>
            )}
          </View>

          {/* Primary Muscles */}
          {exercise.primaryMuscles && Array.isArray(exercise.primaryMuscles) && exercise.primaryMuscles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Músculos Principales</Text>
              <View style={styles.musclesContainer}>
                {exercise.primaryMuscles.map(muscle => renderMuscleChip(muscle, true))}
              </View>
            </View>
          )}

          {/* Secondary Muscles */}
          {exercise.secondaryMuscles && Array.isArray(exercise.secondaryMuscles) && exercise.secondaryMuscles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Músculos Secundarios</Text>
              <View style={styles.musclesContainer}>
                {exercise.secondaryMuscles.map(muscle => renderMuscleChip(muscle, false))}
              </View>
            </View>
          )}

          {/* Instructions */}
          {exercise.instructions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instrucciones</Text>
              <View style={styles.instructionsContainer}>
                {Array.isArray(exercise.instructions) ? (
                  exercise.instructions.map(renderInstructionItem)
                ) : (
                  <View style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                      <Text style={styles.instructionNumberText}>1</Text>
                    </View>
                    <Text style={styles.instructionText}>{exercise.instructions}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Tips Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consejos</Text>
            <View style={styles.tipContainer}>
              <Feather name="info" size={16} color={colors.primary} />
              <Text style={styles.tipText}>
                Mantén una buena postura durante todo el ejercicio y controla el movimiento.
              </Text>
            </View>
            <View style={styles.tipContainer}>
              <Feather name="alert-circle" size={16} color={colors.warning} />
              <Text style={styles.tipText}>
                Si sientes dolor, detén el ejercicio inmediatamente y consulta a un profesional.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  mediaContainer: {
    height: 200,
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.background,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    flex: 1,
    marginLeft: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  retryButtonText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  basicInfoContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  infoValue: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    color: colors.background,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  musclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  muscleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  primaryMuscleChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondaryMuscleChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  muscleChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  primaryMuscleText: {
    color: colors.background,
  },
  secondaryMuscleText: {
    color: colors.textSecondary,
  },
  instructionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: 12,
    color: colors.background,
    fontWeight: '600',
  },
  instructionText: {
    ...typography.body,
    flex: 1,
    lineHeight: 20,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  tipText: {
    ...typography.caption,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
});

export default ExerciseDetail;
