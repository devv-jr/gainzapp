import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '../utils/logger';
import { 
  retryWithRenderOptimization, 
  keepAliveService, 
  RequestOptimizer, 
  DataPreloader,
  performanceMonitor,
  serviceStatusDetector 
} from '../utils/apiOptimization';

const API_URL = 'https://gainz-api.onrender.com';

// Initialize optimizations
const dataPreloader = new DataPreloader({
  getAllMuscles: () => getAllMuscles(),
  getAllEquipment: () => getAllEquipment(), 
  getExercisesByMuscle: (muscle) => getExercisesByMuscle(muscle),
  getExercisesByEquipment: (equipment) => getExercisesByEquipment(equipment),
  getExerciseById: (id) => getExerciseById(id)
});

// Start keep-alive service
keepAliveService.start();

// Utility function for retry with exponential backoff (DEPRECATED - usar retryWithRenderOptimization)
const retryWithBackoff = async (fn, retries = 3) => {
  return retryWithRenderOptimization(fn, 'Legacy API call');
};

// Check connectivity before making API calls
const checkConnectivity = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable !== false;
  } catch (error) {
    logger.warn('Error checking connectivity:', error);
    return false;
  }
};

// Configuración base de axios con optimizaciones
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Timeout inicial, será ajustado dinámicamente
  headers: {
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip', // Habilitar compresión
  },
});

// Interceptor para manejo de errores y métricas
api.interceptors.request.use(
  (config) => {
    // Determinar timeout dinámico basado en estado del servicio
    const shouldUseWakeUpTimeout = serviceStatusDetector.shouldUseWakeUpTimeout();
    config.timeout = shouldUseWakeUpTimeout ? 90000 : 15000;
    
    // Comprimir parámetros si es necesario
    if (config.params) {
      config.params = RequestOptimizer.compressParams(config.params);
    }
    
    config.metadata = { startTime: Date.now() };
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Registrar métricas de éxito
    const duration = Date.now() - response.config.metadata.startTime;
    performanceMonitor.recordRequest(response.config.url, duration, true);
    serviceStatusDetector.markSuccess();
    return response;
  },
  async (error) => {
    // Registrar métricas de fallo
    const duration = error.config?.metadata ? Date.now() - error.config.metadata.startTime : 0;
    performanceMonitor.recordRequest(error.config?.url || 'unknown', duration, false);
    serviceStatusDetector.markFailure(error);
    
    logger.error('API Error:', error.message);
    
    // Check if it's a network connectivity issue
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      throw new Error('Sin conexión a internet. Usando datos guardados localmente.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('La API está tardando en responder. Puede estar iniciándose (Render free tier). Intenta nuevamente.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Error del servidor. Intenta más tarde.');
    }
    if (error.response?.status === 404) {
      throw new Error('Recurso no encontrado.');
    }
    throw error;
  }
);

// Cache keys
const CACHE_KEYS = {
  ALL_EXERCISES: 'cached_exercises_all',
  EXERCISES_BY_MUSCLE: 'cached_exercises_muscle_',
  EXERCISES_BY_EQUIPMENT: 'cached_exercises_equipment_',
  MUSCLES_LIST: 'cached_muscles',
  EQUIPMENT_LIST: 'cached_equipment',
  SEARCH_RESULTS: 'cached_search_',
};

// Funciones de cache
const saveToCache = async (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    logger.warn('Error saving to cache:', error);
  }
};

const getFromCache = async (key, maxAge = 3600000) => { // 1 hora por defecto
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > maxAge) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    logger.warn('Error getting from cache:', error);
    return null;
  }
};

const clearCache = async (pattern = null) => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = pattern 
      ? keys.filter(key => key.includes(pattern))
      : keys.filter(key => Object.values(CACHE_KEYS).some(cacheKey => key.includes(cacheKey)));
    
    await AsyncStorage.multiRemove(keysToRemove);
    logger.debug(`Cache cleared: ${keysToRemove.length} items removed`);
  } catch (error) {
    logger.warn('Error clearing cache:', error);
  }
};

// Función para mapear la estructura de datos de tu API
const mapExerciseData = (exercise) => {
  return {
    id: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    instructions: exercise.instructions || '',
    // Mapear a estructura esperada por la UI
    primaryMuscles: exercise.muscle ? [exercise.muscle] : [],
    secondaryMuscles: [],
    category: exercise.muscle || 'General',
    icon: 'fitness-center',
    image: null, // Tu API no incluye imágenes por ahora
    bodyPart: exercise.muscle || 'general',
    target: exercise.muscle || 'general',
    level: exercise.difficulty || 'Intermedio',
    originalData: exercise,
  };
};

// Funciones principales de la API

// Obtener todos los ejercicios
export const getAllExercises = async () => {
  // Check cache first
  const cached = await getFromCache(CACHE_KEYS.ALL_EXERCISES);
  
  // Check connectivity
  const isOnline = await checkConnectivity();
  if (!isOnline) {
    if (cached) {
      logger.info('Device offline, returning cached exercises');
      return cached;
    } else {
      throw new Error('Sin conexión y no hay ejercicios guardados localmente');
    }
  }

  // If we have cache, return it immediately and update in background
  if (cached) {
    logger.info('Returning cached exercises, updating in background');
    // Update cache in background
    updateCacheInBackground(CACHE_KEYS.ALL_EXERCISES, async () => {
      const response = await retryWithBackoff(() => api.get('/exercises'));
      return response.data.map(mapExerciseData);
    });
    return cached;
  }

  // No cache, need to fetch from API
  try {
    logger.info('Fetching all exercises from API...');
    const exercises = await retryWithBackoff(async () => {
      const response = await api.get('/exercises');
      return response.data.map(mapExerciseData);
    });

    // Save to cache
    await saveToCache(CACHE_KEYS.ALL_EXERCISES, exercises);
    
    return exercises;
  } catch (error) {
    logger.error('Error fetching all exercises:', error);
    throw new Error('Error al cargar ejercicios: ' + error.message);
  }
};

// Helper function to update cache in background
const updateCacheInBackground = async (cacheKey, fetchFunction) => {
  try {
    const freshData = await fetchFunction();
    await saveToCache(cacheKey, freshData);
    logger.debug(`Cache updated in background for: ${cacheKey}`);
  } catch (error) {
    logger.warn(`Failed to update cache in background for: ${cacheKey}`, error);
  }
};

// Obtener ejercicios por músculo
export const getExercisesByMuscle = async (muscle) => {
  try {
    const cacheKey = CACHE_KEYS.EXERCISES_BY_MUSCLE + muscle;
    
    // Verificar cache primero
    const cached = await getFromCache(cacheKey);
    if (cached) {
      console.log(`Returning cached exercises for muscle: ${muscle}`);
      return cached;
    }

    console.log(`Fetching exercises for muscle: ${muscle}`);
    const response = await api.get('/exercises', {
      params: { muscle }
    });
    const exercises = response.data.map(mapExerciseData);

    // Guardar en cache
    await saveToCache(cacheKey, exercises);
    
    return exercises;
  } catch (error) {
    console.error(`Error fetching exercises for muscle ${muscle}:`, error);
    throw new Error('Error al cargar ejercicios por músculo: ' + error.message);
  }
};

// Obtener ejercicios por equipamiento
export const getExercisesByEquipment = async (equipment) => {
  try {
    const cacheKey = CACHE_KEYS.EXERCISES_BY_EQUIPMENT + equipment;
    
    // Verificar cache primero
    const cached = await getFromCache(cacheKey);
    if (cached) {
      console.log(`Returning cached exercises for equipment: ${equipment}`);
      return cached;
    }

    console.log(`Fetching exercises for equipment: ${equipment}`);
    const response = await api.get('/exercises', {
      params: { equipment }
    });
    const exercises = response.data.map(mapExerciseData);

    // Guardar en cache
    await saveToCache(cacheKey, exercises);
    
    return exercises;
  } catch (error) {
    console.error(`Error fetching exercises for equipment ${equipment}:`, error);
    throw new Error('Error al cargar ejercicios por equipamiento: ' + error.message);
  }
};

// Buscar ejercicios (implementación local ya que la API no tiene endpoint de búsqueda)
export const searchExercises = async (query) => {
  try {
    const cacheKey = CACHE_KEYS.SEARCH_RESULTS + query.toLowerCase();
    
    // Verificar cache primero (cache más corto para búsquedas)
    const cached = await getFromCache(cacheKey, 1800000); // 30 minutos
    if (cached) {
      console.log(`Returning cached search results for: ${query}`);
      return cached;
    }

    console.log(`Searching exercises locally for: ${query}`);
    
    // Obtener todos los ejercicios y filtrar localmente
    const allExercises = await getAllExercises();
    const searchTerm = query.toLowerCase();
    
    const filteredExercises = allExercises.filter(exercise => 
      exercise.name.toLowerCase().includes(searchTerm) ||
      exercise.muscle.toLowerCase().includes(searchTerm) ||
      exercise.equipment.toLowerCase().includes(searchTerm) ||
      exercise.difficulty.toLowerCase().includes(searchTerm)
    );

    // Guardar en cache
    await saveToCache(cacheKey, filteredExercises);
    
    return filteredExercises;
  } catch (error) {
    console.error(`Error searching exercises for ${query}:`, error);
    throw new Error('Error al buscar ejercicios: ' + error.message);
  }
};

// Obtener lista de músculos disponibles (inferir de ejercicios existentes)
export const getMusclesList = async () => {
  try {
    // Verificar cache primero
    const cached = await getFromCache(CACHE_KEYS.MUSCLES_LIST);
    if (cached) {
      console.log('Returning cached muscles list');
      return cached;
    }

    console.log('Inferring muscles list from exercises...');
    
    // Obtener algunos ejercicios para inferir músculos disponibles
    const allExercises = await getAllExercises();
    const uniqueMuscles = [...new Set(allExercises.map(exercise => exercise.muscle))];
    
    // Si no hay ejercicios, usar lista por defecto
    const muscles = uniqueMuscles.length > 0 ? uniqueMuscles : [
      'Pecho', 'Espalda', 'Hombros', 'Piernas', 'Brazos', 'Abdominales'
    ];

    // Guardar en cache
    await saveToCache(CACHE_KEYS.MUSCLES_LIST, muscles);
    
    return muscles;
  } catch (error) {
    console.error('Error fetching muscles list:', error);
    // Fallback con lista básica basada en tu documentación
    const fallbackMuscles = [
      'Pecho', 'Espalda', 'Hombros', 'Piernas', 'Brazos', 'Abdominales'
    ];
    return fallbackMuscles;
  }
};

// Obtener lista de equipamiento disponible (inferir de ejercicios existentes)
export const getEquipmentList = async () => {
  try {
    // Verificar cache primero
    const cached = await getFromCache(CACHE_KEYS.EQUIPMENT_LIST);
    if (cached) {
      console.log('Returning cached equipment list');
      return cached;
    }

    console.log('Inferring equipment list from exercises...');
    
    // Obtener algunos ejercicios para inferir equipamiento disponible
    const allExercises = await getAllExercises();
    const uniqueEquipment = [...new Set(allExercises.map(exercise => exercise.equipment))];
    
    // Si no hay ejercicios, usar lista por defecto
    const equipment = uniqueEquipment.length > 0 ? uniqueEquipment : [
      'Barra', 'Mancuernas', 'Peso corporal', 'Máquina', 'Máquina de poleas'
    ];

    // Guardar en cache
    await saveToCache(CACHE_KEYS.EQUIPMENT_LIST, equipment);
    
    return equipment;
  } catch (error) {
    console.error('Error fetching equipment list:', error);
    // Fallback con lista básica basada en tu documentación
    const fallbackEquipment = [
      'Barra', 'Mancuernas', 'Peso corporal', 'Máquina', 'Máquina de poleas'
    ];
    return fallbackEquipment;
  }
};

// Funciones de compatibilidad con la implementación anterior
export const getTargetMuscleList = getMusclesList;
export const getBodyPartList = getMusclesList; // Usar músculos como partes del cuerpo
export const getExercisesByBodyPart = getExercisesByMuscle;

// Función para obtener un ejercicio específico por ID
export const getExerciseById = async (id) => {
  try {
    console.log(`🔍 Buscando ejercicio con ID: ${id}`);
    
    // Intentar obtener desde cache de todos los ejercicios primero
    const cachedData = await getFromCache(CACHE_KEYS.ALL_EXERCISES);
    if (cachedData && Array.isArray(cachedData)) {
      const exercise = cachedData.find(ex => ex.id === parseInt(id));
      if (exercise) {
        console.log(`✅ Ejercicio encontrado en cache: ${exercise.name}`);
        return exercise;
      }
    }

    // Si no está en cache, hacer petición directa a la API
    console.log('📡 Buscando en API remota...');
    const response = await api.get(`/exercises/${id}`);
    
    if (response.data) {
      console.log(`✅ Ejercicio obtenido de API: ${response.data.name}`);
      return response.data;
    }
    
    throw new Error('Ejercicio no encontrado');
  } catch (error) {
    console.error(`❌ Error fetching exercise by ID ${id}:`, error);
    
    // Si la petición directa falla, intentar buscar en todos los ejercicios
    try {
      console.log('🔄 Intentando buscar en lista completa...');
      const allExercises = await getAllExercises();
      const exercise = allExercises.find(ex => ex.id === parseInt(id));
      
      if (exercise) {
        console.log(`✅ Ejercicio encontrado en lista completa: ${exercise.name}`);
        return exercise;
      }
    } catch (searchError) {
      console.error('❌ Error en búsqueda alternativa:', searchError);
    }
    
    throw new Error(`No se pudo obtener el ejercicio con ID ${id}: ${error.message}`);
  }
};

// Funciones de utilidad
export const clearExerciseCache = async () => {
  await clearCache();
};

export const initializeAPI = async () => {
  try {
    console.log('🚀 Inicializando conexión con Gainz API...');
    console.log('⏳ Esperando respuesta (puede tardar si la API está iniciándose)...');
    
    // Hacer una petición de prueba más simple y con más tiempo
    const response = await api.get('/exercises', { 
      timeout: 45000, // 45 segundos para el primer request
      params: { muscle: 'Pecho' }
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      console.log('✅ API inicializada correctamente');
      console.log(`📊 Encontrados ${response.data.length} ejercicios de prueba`);
      
      // Mostrar una muestra de los datos para verificar estructura
      if (response.data.length > 0) {
        console.log('📋 Muestra de ejercicio:', JSON.stringify(response.data[0], null, 2));
      }
      
      return true;
    } else {
      console.warn('⚠️ API respondió pero con formato inusual:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Error inicializando API:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.error('🕐 Timeout - La API puede estar iniciándose (Render free tier)');
      console.error('💡 Sugerencia: Intenta nuevamente en 30-60 segundos');
    }
    
    if (error.message.includes('Network Error')) {
      console.error('🌐 Error de red - Verificando conectividad...');
      // Intentar un ping básico
      try {
        const pingResponse = await fetch('https://gainz-api.onrender.com/docs', { 
          method: 'HEAD',
          timeout: 10000 
        });
        if (pingResponse.ok) {
          console.log('🏓 Ping exitoso - La API está accesible');
        }
      } catch (pingError) {
        console.error('🏓 Ping falló:', pingError.message);
      }
    }
    
    return false;
  }
};

// Diagnóstico del cache (función de compatibilidad)
export const diagnoseCacheIssues = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      Object.values(CACHE_KEYS).some(cacheKey => key.includes(cacheKey))
    );
    
    console.log(`Cache diagnosis: ${cacheKeys.length} items in cache`);
    return {
      totalCacheItems: cacheKeys.length,
      cacheKeys,
    };
  } catch (error) {
    console.warn('Error during cache diagnosis:', error);
    return { totalCacheItems: 0, cacheKeys: [] };
  }
};

// Función de refresco completo
export const forceCompleteRefresh = async () => {
  console.log('🔄 Realizando refresco completo...');
  await clearExerciseCache();
  
  // Pre-cargar datos esenciales
  try {
    await Promise.all([
      getAllExercises(),
      getMusclesList(),
      getEquipmentList(),
    ]);
    console.log('✅ Refresco completo exitoso');
  } catch (error) {
    console.error('❌ Error durante refresco completo:', error);
    throw error;
  }
};

// Función de diagnóstico para verificar conectividad
export const diagnoseConnectivity = async () => {
  console.log('🔍 Diagnosticando conectividad...');
  
  try {
    // Probar conexión básica primero
    console.log('📡 Probando conexión básica...');
    
    // En React Native, usar axios directamente es más confiable que fetch
    const testResponse = await api.get('/exercises', {
      timeout: 45000,
      params: { muscle: 'Pecho' }
    });
    
    console.log('✅ Conectividad OK - API responde correctamente');
    console.log('📊 Ejercicios recibidos:', testResponse.data?.length || 0);
    
    return {
      status: 'success',
      message: 'API funcionando correctamente',
      sampleData: testResponse.data?.slice(0, 2), // Primeros 2 ejercicios como muestra
      totalExercises: testResponse.data?.length || 0
    };
    
  } catch (error) {
    console.error('❌ Error de conectividad:', error);
    
    if (error.code === 'ECONNABORTED') {
      return {
        status: 'timeout',
        message: 'La API está tardando demasiado en responder. Puede estar "durmiendo" (Render free tier).',
        suggestion: 'Intenta nuevamente en 1-2 minutos. La primera conexión puede tardar.',
        details: 'Timeout después de 45 segundos'
      };
    }
    
    if (error.message.includes('Network Error')) {
      return {
        status: 'network_error',
        message: 'Error de red. Verifica tu conexión a internet.',
        suggestion: 'Revisa tu conexión WiFi/datos móviles y que no haya un firewall bloqueando.',
        details: error.message
      };
    }
    
    return {
      status: 'unknown_error',
      message: error.message,
      suggestion: 'Error desconocido. Revisa los logs para más detalles.',
      details: `Código: ${error.code || 'N/A'}, Status: ${error.response?.status || 'N/A'}`
    };
  }
};

export default {
  getAllExercises,
  getExercisesByMuscle,
  getExercisesByEquipment,
  searchExercises,
  getMusclesList,
  getEquipmentList,
  getTargetMuscleList,
  getBodyPartList,
  getExercisesByBodyPart,
  clearExerciseCache,
  initializeAPI,
  diagnoseCacheIssues,
  forceCompleteRefresh,
  diagnoseConnectivity,
  getExerciseById,
  
  // Nuevas funciones optimizadas
  preloadCriticalData: (userPreferences) => dataPreloader.preloadCriticalData(userPreferences),
  preloadExerciseDetails: (exerciseId, muscle) => dataPreloader.preloadExerciseDetails(exerciseId, muscle),
  getPerformanceReport: () => performanceMonitor.getReport(),
  shouldShowPerformanceWarning: () => performanceMonitor.shouldShowPerformanceWarning(),
  startKeepAlive: () => keepAliveService.start(),
  stopKeepAlive: () => keepAliveService.stop(),
};