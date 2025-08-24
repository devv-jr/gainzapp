import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';
import { usePreferences } from '../contexts/PreferencesContext';
import { useContentFilter } from '../hooks/useContentFilter';
import { getAllExercises, searchExercises } from '../services/exerciseApi';

/**
 * Ejemplo de pantalla que muestra ejercicios filtrados por preferencias del usuario
 * Puedes usar esto como base para tus pantallas de ejercicios
 */
const FilteredExercisesExample = ({ navigation }) => {
  const { preferences, isQuizCompleted } = usePreferences();
  const { 
    filterExercises, 
    getRecommendedExercises, 
    getFilterStats,
    activeFilters,
    hasActiveFilters,
    searchAndFilter 
  } = useContentFilter();
  
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar ejercicios al montar el componente
  useEffect(() => {
    loadExercises();
  }, []);

  // Aplicar filtros cuando cambien las preferencias o los ejercicios
  useEffect(() => {
    if (exercises.length > 0) {
      applyFilters();
    }
  }, [exercises, preferences, filterExercises]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAllExercises();
      setExercises(data);
      
      console.log(`✅ Cargados ${data.length} ejercicios de la API`);
    } catch (err) {
      console.error('❌ Error cargando ejercicios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!isQuizCompleted) {
      // Si no ha completado el quiz, mostrar todos los ejercicios
      setFilteredExercises(exercises);
      return;
    }

    // Aplicar filtros basados en preferencias del usuario
    const filtered = filterExercises(exercises);
    setFilteredExercises(filtered);

    // Log para debugging
    const stats = getFilterStats(exercises, filtered);
    console.log(`🔍 Filtrado: ${stats.filtered}/${stats.original} ejercicios (${stats.percentage}%)`);
    console.log('🎯 Filtros activos:', activeFilters);
  };

  const handleSearchExample = async (query) => {
    try {
      setLoading(true);
      
      // Buscar en la API
      const searchResults = await searchExercises(query);
      
      // Aplicar filtros de preferencias a los resultados
      const filteredResults = searchAndFilter(searchResults, '');
      
      setFilteredExercises(filteredResults);
      
      console.log(`🔍 Búsqueda "${query}": ${filteredResults.length} resultados filtrados`);
    } catch (err) {
      console.error('❌ Error en búsqueda:', err);
      Alert.alert('Error', 'No se pudieron buscar ejercicios');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendations = () => {
    if (exercises.length === 0) return [];
    
    return getRecommendedExercises(exercises, 3);
  };

  // Mostrar estado de carga
  if (loading) {
    return (
      <SafeAreaView style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { marginTop: spacing.md, textAlign: 'center' }]}>
          Cargando ejercicios personalizados...
        </Text>
      </SafeAreaView>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <SafeAreaView style={globalStyles.centerContainer}>
        <Text style={[typography.h3, { color: colors.error, textAlign: 'center', marginBottom: spacing.md }]}>
          Error
        </Text>
        <Text style={[typography.body, { textAlign: 'center', marginBottom: spacing.lg }]}>
          {error}
        </Text>
        <TouchableOpacity style={globalStyles.primaryButton} onPress={loadExercises}>
          <Text style={globalStyles.primaryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const recommendations = getRecommendations();
  const stats = getFilterStats(exercises, filteredExercises);

  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={typography.h2}>Ejercicios Personalizados</Text>
          {!isQuizCompleted && (
            <Text style={[typography.caption, { color: colors.warning }]}>
              Completa tu perfil para ver recomendaciones personalizadas
            </Text>
          )}
        </View>

        {/* Estadísticas de filtrado */}
        {hasActiveFilters && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Filtros Aplicados</Text>
            <Text style={styles.statsText}>
              Mostrando {stats.filtered} de {stats.original} ejercicios ({stats.percentage}%)
            </Text>
            
            {/* Mostrar filtros activos */}
            <View style={styles.activeFiltersContainer}>
              {activeFilters.bodyFocus.length > 0 && (
                <Text style={styles.filterTag}>
                  🎯 {activeFilters.bodyFocus.join(', ')}
                </Text>
              )}
              {activeFilters.equipment.length > 0 && (
                <Text style={styles.filterTag}>
                  🏋️ {activeFilters.equipment.join(', ')}
                </Text>
              )}
              {activeFilters.experience && (
                <Text style={styles.filterTag}>
                  📊 {activeFilters.experience}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Recomendaciones */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recomendados para Ti</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationsContainer}
            >
              {recommendations.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.recommendationCard}
                  onPress={() => {
                    console.log(`Seleccionado: ${exercise.name}`);
                    // Aquí navegarías a la pantalla de detalle del ejercicio
                  }}
                >
                  <Text style={styles.exerciseIcon}>💪</Text>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMuscle}>{exercise.muscle}</Text>
                  <Text style={styles.exerciseEquipment}>{exercise.equipment}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Botones de ejemplo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ejemplos de Uso</Text>
          
          <TouchableOpacity
            style={styles.exampleButton}
            onPress={() => handleSearchExample('pecho')}
          >
            <Text style={styles.exampleButtonText}>Buscar "pecho" + filtros</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.exampleButton}
            onPress={() => handleSearchExample('piernas')}
          >
            <Text style={styles.exampleButtonText}>Buscar "piernas" + filtros</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exampleButton, { backgroundColor: colors.surface }]}
            onPress={loadExercises}
          >
            <Text style={[styles.exampleButtonText, { color: colors.textPrimary }]}>
              Recargar Todos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de ejercicios filtrados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Ejercicios ({filteredExercises.length})
          </Text>
          
          {filteredExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No hay ejercicios que coincidan con tus preferencias
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Intenta ajustar tus filtros o completa tu perfil
              </Text>
            </View>
          ) : (
            filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => {
                  console.log(`Seleccionado ejercicio:`, exercise);
                  // Navegar a detalle del ejercicio
                }}
              >
                <View style={styles.exerciseCardContent}>
                  <Text style={styles.exerciseCardName}>{exercise.name}</Text>
                  <Text style={styles.exerciseCardMuscle}>{exercise.muscle}</Text>
                  <View style={styles.exerciseCardMeta}>
                    <Text style={styles.exerciseCardEquipment}>🏋️ {exercise.equipment}</Text>
                    <Text style={styles.exerciseCardDifficulty}>📊 {exercise.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.exerciseCardArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingVertical: spacing.lg,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statsTitle: {
    ...typography.h4,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statsText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterTag: {
    ...typography.caption,
    backgroundColor: colors.primary,
    color: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  recommendationsContainer: {
    paddingRight: spacing.lg,
  },
  recommendationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.md,
    alignItems: 'center',
    minWidth: 120,
  },
  exerciseIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  exerciseName: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  exerciseMuscle: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  exerciseEquipment: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  exampleButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  exampleButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseCardContent: {
    flex: 1,
  },
  exerciseCardName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  exerciseCardMuscle: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  exerciseCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseCardEquipment: {
    ...typography.caption,
    color: colors.textMuted,
  },
  exerciseCardDifficulty: {
    ...typography.caption,
    color: colors.textMuted,
  },
  exerciseCardArrow: {
    ...typography.h3,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default FilteredExercisesExample;
