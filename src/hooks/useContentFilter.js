import { useMemo } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';

/**
 * Hook para filtrar contenido basado en las preferencias del usuario
 * Adaptado para funcionar con tu API de Gainz
 */
export const useContentFilter = () => {
  const { preferences, getActiveFilters } = usePreferences();

  // Filtros activos memoizados
  const activeFilters = useMemo(() => getActiveFilters(), [preferences]);

  /**
   * Filtrar ejercicios basado en preferencias del usuario
   * Adaptado para la estructura de tu API de ejercicios
   */
  const filterExercises = useMemo(() => {
    return (exercises) => {
      if (!exercises || !preferences) return exercises;

      return exercises.filter(exercise => {
        // Filtro por grupos musculares (basado en tu API)
        if (activeFilters.bodyFocus.length > 0) {
          // Tu API usa 'muscle' para el grupo muscular principal
          const exerciseMuscle = exercise.muscle || exercise.primaryMuscles?.[0];
          const hasMatchingMuscle = activeFilters.bodyFocus.some(userMuscle => 
            exerciseMuscle && exerciseMuscle.toLowerCase().includes(userMuscle.toLowerCase())
          );
          if (!hasMatchingMuscle) return false;
        }

        // Filtro por equipamiento (basado en tu API)
        if (activeFilters.equipment.length > 0) {
          const exerciseEquipment = exercise.equipment;
          const hasCompatibleEquipment = activeFilters.equipment.some(userEquip =>
            exerciseEquipment && (
              exerciseEquipment.toLowerCase().includes(userEquip.toLowerCase()) ||
              // Peso corporal es compatible con todo
              userEquip === 'Peso corporal'
            )
          );
          if (!hasCompatibleEquipment) return false;
        }

        // Filtro por nivel de experiencia (basado en tu API)
        if (activeFilters.experience) {
          const exerciseDifficulty = exercise.difficulty;
          
          // Mapear niveles de experiencia del usuario a dificultades de ejercicios
          const difficultyMapping = {
            'Principiante': ['Principiante', 'Fácil'],
            'Intermedio': ['Principiante', 'Intermedio', 'Fácil', 'Moderado'],
            'Avanzado': ['Principiante', 'Intermedio', 'Avanzado', 'Fácil', 'Moderado', 'Difícil']
          };
          
          const allowedDifficulties = difficultyMapping[activeFilters.experience] || ['Intermedio'];
          const isDifficultyAllowed = allowedDifficulties.some(allowed =>
            exerciseDifficulty && exerciseDifficulty.toLowerCase().includes(allowed.toLowerCase())
          );
          
          if (!isDifficultyAllowed) return false;
        }

        // Filtro por tipo de gimnasio
        if (activeFilters.gymType === 'home') {
          // Solo ejercicios que se pueden hacer en casa
          const homeCompatibleEquipment = ['Peso corporal', 'Mancuernas', 'peso corporal', 'mancuernas'];
          const isHomeCompatible = homeCompatibleEquipment.some(homeEquip =>
            exercise.equipment && exercise.equipment.toLowerCase().includes(homeEquip.toLowerCase())
          );
          if (!isHomeCompatible) return false;
        }

        return true;
      });
    };
  }, [activeFilters]);

  /**
   * Obtener ejercicios recomendados basados en preferencias
   */
  const getRecommendedExercises = (exercises, limit = 5) => {
    if (!exercises || !preferences) return [];

    const filtered = filterExercises(exercises);
    
    // Priorizar por objetivos del usuario
    const prioritized = filtered.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Puntaje por objetivo/meta
      activeFilters.goals.forEach(goal => {
        // Mapear objetivos a músculos/tipos de ejercicios
        const goalMuscleMapping = {
          'strength': ['Pecho', 'Espalda', 'Piernas'],
          'muscle': ['Pecho', 'Brazos', 'Hombros'],
          'weight_loss': ['Piernas', 'Abdominales'], // ejercicios que queman más calorías
          'endurance': ['Piernas', 'Abdominales'],
          'tone': ['Brazos', 'Hombros', 'Abdominales'],
          'health': ['Espalda', 'Pecho', 'Piernas']
        };
        
        const targetMuscles = goalMuscleMapping[goal] || [];
        targetMuscles.forEach(targetMuscle => {
          if (a.muscle && a.muscle.includes(targetMuscle)) scoreA += 3;
          if (b.muscle && b.muscle.includes(targetMuscle)) scoreB += 3;
        });
      });

      // Puntaje por grupo muscular objetivo del usuario
      activeFilters.bodyFocus.forEach(focus => {
        if (a.muscle && a.muscle.includes(focus)) scoreA += 2;
        if (b.muscle && b.muscle.includes(focus)) scoreB += 2;
      });

      // Puntaje por nivel (ejercicios del nivel exacto tienen prioridad)
      if (a.difficulty === activeFilters.experience) scoreA += 1;
      if (b.difficulty === activeFilters.experience) scoreB += 1;

      return scoreB - scoreA;
    });

    return prioritized.slice(0, limit);
  };

  /**
   * Verificar si un ejercicio coincide con las preferencias del usuario
   */
  const matchesUserPreferences = (exercise) => {
    if (!exercise || !preferences) return false;

    let matchScore = 0;
    let totalCriteria = 0;

    // Verificar grupos musculares
    if (activeFilters.bodyFocus.length > 0) {
      totalCriteria++;
      const exerciseMuscle = exercise.muscle || '';
      if (activeFilters.bodyFocus.some(userMuscle => 
        exerciseMuscle.toLowerCase().includes(userMuscle.toLowerCase())
      )) {
        matchScore++;
      }
    }

    // Verificar objetivos (mapeo indirecto)
    if (activeFilters.goals.length > 0) {
      totalCriteria++;
      // Lógica simple: si el ejercicio coincide con el músculo objetivo, suma puntos
      const exerciseMuscle = exercise.muscle || '';
      if (exerciseMuscle) {
        matchScore++;
      }
    }

    // Verificar equipamiento
    if (activeFilters.equipment.length > 0) {
      totalCriteria++;
      const exerciseEquipment = exercise.equipment || '';
      if (activeFilters.equipment.some(userEquip =>
        exerciseEquipment.toLowerCase().includes(userEquip.toLowerCase())
      )) {
        matchScore++;
      }
    }

    return totalCriteria > 0 ? (matchScore / totalCriteria) >= 0.5 : true;
  };

  /**
   * Obtener estadísticas de filtrado
   */
  const getFilterStats = (originalContent, filteredContent) => {
    const originalCount = originalContent?.length || 0;
    const filteredCount = filteredContent?.length || 0;
    const filteredPercentage = originalCount > 0 ? (filteredCount / originalCount) * 100 : 0;

    return {
      original: originalCount,
      filtered: filteredCount,
      percentage: Math.round(filteredPercentage),
      activeFiltersCount: Object.values(activeFilters).filter(filter => 
        Array.isArray(filter) ? filter.length > 0 : filter
      ).length
    };
  };

  /**
   * Buscar ejercicios por query y aplicar filtros de preferencias
   */
  const searchAndFilter = (exercises, searchQuery) => {
    if (!exercises) return [];
    
    let results = exercises;
    
    // Primero aplicar búsqueda por texto
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(exercise => 
        exercise.name?.toLowerCase().includes(query) ||
        exercise.muscle?.toLowerCase().includes(query) ||
        exercise.equipment?.toLowerCase().includes(query) ||
        exercise.difficulty?.toLowerCase().includes(query) ||
        exercise.instructions?.toLowerCase().includes(query)
      );
    }
    
    // Luego aplicar filtros de preferencias
    return filterExercises(results);
  };

  /**
   * Obtener ejercicios para objetivos específicos
   */
  const getExercisesForGoal = (exercises, goal) => {
    if (!exercises) return [];

    const goalFilters = {
      'strength': { muscles: ['Pecho', 'Espalda', 'Piernas'], equipment: ['Barra', 'Mancuernas'] },
      'muscle': { muscles: ['Pecho', 'Brazos', 'Hombros'], equipment: ['Mancuernas', 'Máquina'] },
      'weight_loss': { muscles: ['Piernas', 'Abdominales'], equipment: ['Peso corporal'] },
      'endurance': { muscles: ['Piernas'], equipment: ['Peso corporal'] },
      'tone': { muscles: ['Brazos', 'Hombros'], equipment: ['Mancuernas', 'Peso corporal'] }
    };

    const filter = goalFilters[goal];
    if (!filter) return exercises;

    return exercises.filter(exercise => {
      const muscleMatch = filter.muscles.some(muscle => 
        exercise.muscle && exercise.muscle.includes(muscle)
      );
      const equipmentMatch = filter.equipment.some(equip =>
        exercise.equipment && exercise.equipment.includes(equip)
      );
      
      return muscleMatch || equipmentMatch;
    });
  };

  return {
    // Funciones de filtrado principales
    filterExercises,
    
    // Recomendaciones
    getRecommendedExercises,
    
    // Búsqueda y filtrado combinado
    searchAndFilter,
    getExercisesForGoal,
    
    // Utilidades
    matchesUserPreferences,
    getFilterStats,
    
    // Estado
    activeFilters,
    hasActiveFilters: Object.values(activeFilters).some(filter => 
      Array.isArray(filter) ? filter.length > 0 : filter
    ),
    
    // Información de preferencias del usuario
    userPreferences: {
      bodyFocus: activeFilters.originalBodyFocus || [],
      equipment: activeFilters.originalEquipment || [],
      experience: activeFilters.originalExperience || 'beginner',
      goals: activeFilters.goals || [],
      timeLimit: activeFilters.timeLimit || 60,
      gymType: activeFilters.gymType || '',
    }
  };
};

export default useContentFilter;
