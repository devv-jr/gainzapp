import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';
import { routineService } from '../services/routineService';
import { useAuth } from '../contexts/AuthContext';
import RoutineMigration from '../utils/routineMigration';
import RoutineDebugger from '../utils/routineDebugger';

const Routines = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('Todas');
  const [customRoutines, setCustomRoutines] = useState([]);
  const [recommendedRoutines, setRecommendedRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar rutinas al montar el componente
  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // PASO 1: Ejecutar migración automática para separar rutinas por usuario
      try {
        const migrationResult = await RoutineMigration.migrateUserRoutines(user.uid);
        if (migrationResult) {
          console.log(`Rutinas migradas: ${migrationResult.migrated}, Total: ${migrationResult.total}`);
        }
      } catch (migrationError) {
        console.error('Migration error (non-critical):', migrationError);
        // Continuar aunque falle la migración
      }
      
      // PASO 2: Limpiar rutinas duplicadas si existen para este usuario específico
      await routineService.cleanDuplicateRoutines(user.uid);
      
      // PASO 3: Cargar todas las rutinas del usuario
      const userRoutines = await routineService.getUserRoutines(user.uid);
      
      // PASO 4: Filtrar rutinas personalizadas (solo las creadas por el usuario)
      const custom = userRoutines.filter(routine => 
        routine.isCustom === true && routine.isGenerated !== true
      );
      setCustomRoutines(custom);

      // PASO 5: Generar rutinas recomendadas basadas en el quiz (sin duplicar si ya existen)
      const existingGenerated = userRoutines.filter(routine => routine.isGenerated === true);
      
      if (existingGenerated.length === 0) {
        // Solo generar si no existen rutinas generadas para este usuario
        const recommended = await routineService.generateRecommendedRoutines(user.uid);
        setRecommendedRoutines(recommended);
      } else {
        // Usar las rutinas generadas existentes para este usuario
        setRecommendedRoutines(existingGenerated);
      }
      
      // PASO 6: Debug en desarrollo (se puede quitar después)
      if (__DEV__ && RoutineDebugger) {
        console.log('🔧 Running routine system verification...');
        await RoutineDebugger.runFullCheck(user.uid);
      }
      
    } catch (error) {
      console.error('Error loading routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRoutines();
    setRefreshing(false);
  };

  const navigateToRoutine = (routine) => {
    navigation.navigate('RoutineDetail', { 
      routine,
      isCustom: routine.isCustom || false
    });
  };

  const navigateToCreateRoutine = () => {
    navigation.navigate('CreateRoutine');
  };
  
  // Filtros para rutinas
  const filterOptions = ['Todas', 'Push/Pull/Legs', 'Cuerpo completo', 'Cardio', 'Personalizada'];

  // Combinar todas las rutinas
  const allRoutines = [...recommendedRoutines, ...customRoutines];

  // Filtrar rutinas según el filtro seleccionado
  const filteredRoutines = allRoutines.filter(routine => {
    if (selectedFilter === 'Todas') return true;
    
    // Filtrar por rutinas personalizadas (creadas por el usuario)
    if (selectedFilter === 'Personalizada') {
      return routine.isCustom === true && routine.isGenerated !== true;
    }
    
    // Mapear nombres de filtros a categorías de rutinas
    const categoryMap = {
      'Push/Pull/Legs': ['Push/Pull/Legs', 'push', 'pull', 'legs'],
      'Cuerpo completo': ['Cuerpo completo', 'cuerpo-completo', 'full body'],
      'Cardio': ['Cardio', 'HIIT', 'cardio', 'hiit']
    };
    
    const categories = categoryMap[selectedFilter] || [selectedFilter];
    
    return categories.some(category => 
      routine.category?.toLowerCase().includes(category.toLowerCase()) ||
      routine.type?.toLowerCase().includes(category.toLowerCase()) ||
      routine.tags?.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
    );
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Principiante': return colors.success;
      case 'Intermedio': return colors.warning;
      case 'Avanzado': return colors.error;
      default: return colors.textMuted;
    }
  };

  const getCategoryIcon = (type, isCustom) => {
    if (isCustom) return 'person';
    
    switch (type) {
      case 'Push/Pull/Legs': return 'barbell';
      case 'Cuerpo completo': return 'body';
      case 'Cardio': return 'heart';
      case 'Personalizada': return 'star';
      default: return 'fitness';
    }
  };

  const renderRoutineCard = (routine, index) => (
    <TouchableOpacity
      key={routine.id || `routine_${index}`}
      style={[styles.routineCard, routine.featured && styles.featuredRoutineCard]}
      onPress={() => navigateToRoutine(routine)}
    >
      {routine.featured && (
        <View style={styles.featuredIndicator}>
          <Ionicons name="star" size={12} color={colors.background} />
          <Text style={styles.featuredIndicatorText}>RECOMENDADA</Text>
        </View>
      )}
      
      {routine.isCustom && (
        <View style={styles.customIndicator}>
          <Ionicons name="person" size={12} color={colors.background} />
          <Text style={styles.customIndicatorText}>PERSONALIZADA</Text>
        </View>
      )}
      
      <View style={styles.routineHeader}>
        <View style={styles.routineIconContainer}>
          <Ionicons 
            name={getCategoryIcon(routine.category || routine.type, routine.isCustom)} 
            size={24} 
            color={colors.primary} 
          />
        </View>
        <View style={styles.routineHeaderInfo}>
          <Text style={styles.routineName}>{routine.name}</Text>
          <Text style={styles.routineDescription}>{routine.description}</Text>
        </View>
      </View>

      <View style={styles.routineStats}>
        <View style={styles.statItem}>
          <MaterialIcons name="fitness-center" size={16} color={colors.textMuted} />
          <Text style={styles.statText}>{routine.exercises?.length || routine.totalExercises} ejercicios</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time" size={16} color={colors.textMuted} />
          <Text style={styles.statText}>{routine.estimatedTime}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="body" size={16} color={colors.textMuted} />
          <Text style={styles.statText}>{routine.targetMuscles || routine.muscle}</Text>
        </View>
      </View>

      <View style={styles.routineDetails}>
        <Text style={styles.detailLabel}>Ejercicios incluidos:</Text>
        <View style={styles.exercisesContainer}>
          {(routine.exercises || []).slice(0, 3).map((exercise, index) => (
            <View key={index} style={styles.exerciseChip}>
              <Text style={styles.exerciseText}>
                {typeof exercise === 'string' ? exercise : exercise.name}
              </Text>
            </View>
          ))}
          {(routine.exercises?.length || 0) > 3 && (
            <View style={styles.exerciseChip}>
              <Text style={styles.exerciseText}>+{routine.exercises.length - 3} más</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.routineFooter}>
        <View style={styles.routineMetadata}>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(routine.difficulty) }]}>
            <Text style={styles.difficultyText}>{routine.difficulty}</Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{routine.type || routine.category}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => navigateToRoutine(routine)}
        >
          <Ionicons name="arrow-forward" size={18} color={colors.background} />
          <Text style={styles.viewButtonText}>Ver</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Mis Rutinas</Text>
            <Text style={styles.headerSubtitle}>
              {selectedFilter === 'Todas' 
                ? `${recommendedRoutines.length} recomendadas • ${customRoutines.length} personalizadas` 
                : `${filteredRoutines.length} rutinas en ${selectedFilter}`}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={navigateToCreateRoutine}
          >
            <Ionicons name="add" size={24} color={colors.background} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerDescription}>
          Rutinas personalizadas y recomendaciones basadas en tus preferencias
        </Text>
      </View>

      {/* Filter Options */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.filterChipActive
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter && styles.filterChipTextActive
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Routines List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <MaterialIcons name="fitness-center" size={48} color={colors.primary} />
            <Text style={styles.loadingText}>Cargando rutinas...</Text>
          </View>
        ) : filteredRoutines.length > 0 ? (
          <>
            {/* Sección de rutinas personalizadas */}
            {customRoutines.length > 0 && selectedFilter === 'Todas' && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Rutinas Personalizadas</Text>
                <Text style={styles.sectionSubtitle}>{customRoutines.length} creadas por ti</Text>
              </View>
            )}
            
            {/* Sección de rutinas recomendadas */}
            {recommendedRoutines.length > 0 && selectedFilter === 'Todas' && customRoutines.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recomendadas para Ti</Text>
                <Text style={styles.sectionSubtitle}>Basadas en tus preferencias</Text>
              </View>
            )}
            
            {filteredRoutines.map((routine, index) => renderRoutineCard(routine, index))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="fitness-center" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {selectedFilter === 'Personalizada' ? 'No tienes rutinas personalizadas' : 'No hay rutinas en esta categoría'}
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'Personalizada' 
                ? 'Toca el botón + para crear tu primera rutina personalizada' 
                : 'Selecciona otra categoría para ver más rutinas'
              }
            </Text>
            {selectedFilter === 'Personalizada' && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={navigateToCreateRoutine}
              >
                <Ionicons name="add" size={20} color={colors.background} />
                <Text style={styles.emptyButtonText}>Crear Rutina</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  headerDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  betaBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  betaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
  },
  createButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
  },
  filterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  routineCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...globalStyles.shadow,
  },
  featuredRoutineCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  featuredIndicator: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
  },
  featuredIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
    marginLeft: 2,
  },
  customIndicator: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
  },
  customIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
    marginLeft: 2,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  routineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  routineHeaderInfo: {
    flex: 1,
  },
  routineName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  routineDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  routineStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    ...typography.small,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  routineDetails: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  exercisesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  exerciseChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  exerciseText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  routineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineMetadata: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  categoryText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  difficultyText: {
    fontSize: 11,
    color: colors.background,
    fontWeight: '600',
  },
  lastUsedText: {
    ...typography.small,
    color: colors.textMuted,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  viewButtonText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
    marginTop: spacing.md,
  },
  emptyButtonText: {
    color: colors.background,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});

export default Routines;