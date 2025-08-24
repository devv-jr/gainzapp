// Utilidades de API para React Native - Adaptado para Gainz API
import React, { useEffect, useState, useCallback } from 'react';
import { 
  initializeAPI, 
  getAllExercises, 
  clearExerciseCache, 
  diagnoseCacheIssues,
  forceCompleteRefresh,
  getMusclesList,
  getEquipmentList,
  getExercisesByMuscle,
  getExercisesByEquipment,
  searchExercises as searchExercisesAPI,
  diagnoseConnectivity
} from '../services/exerciseApi';

// 1. Hook personalizado para inicialización de API
export const useAPIInitialization = ({ initialFilterType = 'bodyPart' } = {}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableFilters, setAvailableFilters] = useState([]);
  const [filtersMeta, setFiltersMeta] = useState({});
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState(initialFilterType);

  const loadFilters = useCallback(async (type) => {
    try {
      let filters = [];
      let meta = {};

      switch (type) {
        case 'muscle':
          filters = await getMusclesList();
          meta = { type: 'muscle', label: 'Músculo', total: filters.length };
          break;
        case 'equipment':
          filters = await getEquipmentList();
          meta = { type: 'equipment', label: 'Equipamiento', total: filters.length };
          break;
        case 'bodyPart':
        default:
          // Para tu API, usar músculos como partes del cuerpo
          filters = await getMusclesList();
          meta = { type: 'bodyPart', label: 'Parte del Cuerpo', total: filters.length };
      }

      // Formatear filtros para compatibilidad con la UI existente
      const formattedFilters = filters.map(filter => ({
        nameEs: typeof filter === 'string' ? filter : filter.nameEs || filter.name || filter,
        nameEn: typeof filter === 'string' ? filter.toLowerCase() : filter.nameEn || filter.name || filter
      }));

      setAvailableFilters(formattedFilters);
      setFiltersMeta(meta);
    } catch (filterError) {
      console.warn('Error loading filters:', filterError);
      // Fallback con filtros básicos
      setAvailableFilters([
        { nameEs: 'Pecho', nameEn: 'chest' },
        { nameEs: 'Espalda', nameEn: 'back' },
        { nameEs: 'Hombros', nameEn: 'shoulders' },
        { nameEs: 'Brazos', nameEn: 'arms' },
        { nameEs: 'Piernas', nameEn: 'legs' },
        { nameEs: 'Core', nameEn: 'core' }
      ]);
      setFiltersMeta({ type: 'bodyPart', label: 'Parte del Cuerpo', total: 6 });
    }
  }, []);

  const changeFilterType = useCallback(async (newType) => {
    setFilterType(newType);
    await loadFilters(newType);
  }, [loadFilters]);

  useEffect(() => {
    const setupAPI = async () => {
      try {
        setError(null);
        console.log('🚀 Inicializando Gainz API...');
        
        const success = await initializeAPI();
        
        if (success) {
          console.log('✅ Gainz API inicializada correctamente');
          await loadFilters(filterType);
          setIsInitialized(true);
        } else {
          console.log('⚠️ API inicializada con advertencias');
          await loadFilters(filterType);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('❌ Error inicializando API:', error);
        setError('Error al inicializar la API');
        // Aún cargar filtros básicos en caso de error
        await loadFilters(filterType);
        setIsInitialized(true);
      }
    };

    setupAPI();
  }, [filterType, loadFilters]);

  return {
    isInitialized,
    availableFilters,
    filtersMeta,
    error,
    changeFilterType,
  };
};

// 2. Hook personalizado para manejar ejercicios
export const useExercises = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastOperation, setLastOperation] = useState(null);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastOperation('Cargando todos los ejercicios');
    
    try {
      const data = await getAllExercises();
      setExercises(data);
    } catch (err) {
      setError(err.message);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchExercises = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    setLastOperation(`Buscando: ${query}`);
    
    try {
      const data = await searchExercisesAPI(query);
      setExercises(data);
    } catch (err) {
      setError(err.message);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterByType = useCallback(async (filterType, filterValue) => {
    setLoading(true);
    setError(null);
    setLastOperation(`Filtrando por ${filterType}: ${filterValue}`);
    
    try {
      let data = [];
      
      switch (filterType) {
        case 'muscle':
        case 'bodyPart':
          data = await getExercisesByMuscle(filterValue);
          break;
        case 'equipment':
          data = await getExercisesByEquipment(filterValue);
          break;
        default:
          data = await getAllExercises();
      }
      
      setExercises(data);
    } catch (err) {
      setError(err.message);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastOperation('Refrescando ejercicios');
    
    try {
      await clearExerciseCache();
      const data = await getAllExercises();
      setExercises(data);
    } catch (err) {
      setError(err.message);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAndReload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastOperation('Limpieza completa y recarga');
    
    try {
      const data = await forceCompleteRefresh();
      setExercises(data);
    } catch (err) {
      setError(err.message);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    exercises,
    loading,
    error,
    lastOperation,
    loadExercises,
    searchExercises,
    filterByType,
    refreshExercises,
    clearAndReload,
  };
};
