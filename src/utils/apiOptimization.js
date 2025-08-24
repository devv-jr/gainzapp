// Sistema de optimización para API en Render (Free Tier)
import { logger } from './logger';
import NetInfo from '@react-native-community/netinfo';

/**
 * CONFIGURACIÓN PARA RENDER FREE TIER
 * - Los servicios gratuitos se "duermen" después de 15 minutos de inactividad
 * - Pueden tardar 30-60 segundos en "despertar"
 * - Timeout y reintentos optimizados para esto
 */

/**
 * Configuración optimizada para Render
 */
export const RENDER_CONFIG = {
  // Timeouts progresivos: primer request más largo para "despertar"
  WAKE_UP_TIMEOUT: 90000,    // 90 segundos para despertar el servicio
  NORMAL_TIMEOUT: 15000,     // 15 segundos para requests normales
  RETRY_TIMEOUT: 8000,       // 8 segundos para reintentos
  
  // Estrategia de reintentos
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 1.5,
  
  // Keep-alive para evitar que se duerma
  KEEP_ALIVE_INTERVAL: 10 * 60 * 1000, // 10 minutos
  PING_ENDPOINT: '/health',
  
  // Detección de servicio dormido
  SLEEP_INDICATORS: [
    'ECONNABORTED',
    'TIMEOUT',
    'Network Error',
    'Request failed with status code 503',
    'Request failed with status code 504'
  ]
};

/**
 * Detector de estado del servicio
 */
class ServiceStatusDetector {
  constructor() {
    this.isServiceAsleep = false;
    this.lastSuccessfulRequest = Date.now();
    this.consecutiveFailures = 0;
  }
  
  markSuccess() {
    this.isServiceAsleep = false;
    this.lastSuccessfulRequest = Date.now();
    this.consecutiveFailures = 0;
    logger.info('Service is awake and responding');
  }
  
  markFailure(error) {
    this.consecutiveFailures++;
    
    // Detectar si el servicio está dormido
    const errorMessage = error.message || error.toString();
    const isSleepIndicator = RENDER_CONFIG.SLEEP_INDICATORS.some(indicator => 
      errorMessage.includes(indicator)
    );
    
    if (isSleepIndicator || this.consecutiveFailures >= 2) {
      this.isServiceAsleep = true;
      logger.info('Service appears to be asleep, will use wake-up strategy');
    }
  }
  
  shouldUseWakeUpTimeout() {
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulRequest;
    return this.isServiceAsleep || timeSinceLastSuccess > 15 * 60 * 1000; // 15 minutos
  }
}

export const serviceStatusDetector = new ServiceStatusDetector();

/**
 * Función de reintento optimizada para Render
 */
export const retryWithRenderOptimization = async (fn, context = 'API call') => {
  let lastError;
  
  for (let attempt = 1; attempt <= RENDER_CONFIG.MAX_RETRIES; attempt++) {
    try {
      // Determinar timeout basado en el estado del servicio
      const timeout = serviceStatusDetector.shouldUseWakeUpTimeout() 
        ? RENDER_CONFIG.WAKE_UP_TIMEOUT 
        : (attempt === 1 ? RENDER_CONFIG.NORMAL_TIMEOUT : RENDER_CONFIG.RETRY_TIMEOUT);
      
      logger.info(`${context} - Attempt ${attempt}/${RENDER_CONFIG.MAX_RETRIES} (timeout: ${timeout}ms)`);
      
      const result = await fn(timeout);
      serviceStatusDetector.markSuccess();
      return result;
      
    } catch (error) {
      lastError = error;
      serviceStatusDetector.markFailure(error);
      
      logger.warn(`${context} - Attempt ${attempt} failed:`, error.message);
      
      // Si es el último intento, lanzar el error
      if (attempt === RENDER_CONFIG.MAX_RETRIES) {
        break;
      }
      
      // Calcular delay con backoff exponencial
      const baseDelay = 1000 * attempt;
      const delay = baseDelay * Math.pow(RENDER_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);
      
      logger.info(`${context} - Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  throw new Error(`${context} failed after ${RENDER_CONFIG.MAX_RETRIES} attempts. Last error: ${lastError.message}`);
};

/**
 * Keep-alive service para mantener la API despierta
 */
class KeepAliveService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.intervalId = null;
    this.isEnabled = false;
  }
  
  start() {
    if (this.intervalId) {
      this.stop();
    }
    
    this.isEnabled = true;
    logger.info('Starting keep-alive service');
    
    // Ping inmediato
    this.ping();
    
    // Configurar interval
    this.intervalId = setInterval(() => {
      this.ping();
    }, RENDER_CONFIG.KEEP_ALIVE_INTERVAL);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isEnabled = false;
    logger.info('Keep-alive service stopped');
  }
  
  async ping() {
    if (!this.isEnabled) return;
    
    try {
      // Verificar conectividad primero
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        logger.debug('Keep-alive skipped: device offline');
        return;
      }
      
      const response = await fetch(`${this.apiUrl}${RENDER_CONFIG.PING_ENDPOINT}`, {
        method: 'GET',
        timeout: 5000,
      });
      
      if (response.ok) {
        serviceStatusDetector.markSuccess();
        logger.debug('Keep-alive ping successful');
      } else {
        logger.debug('Keep-alive ping failed:', response.status);
      }
    } catch (error) {
      logger.debug('Keep-alive ping error:', error.message);
      // No marcar como fallo crítico, es solo keep-alive
    }
  }
}

export const keepAliveService = new KeepAliveService('https://gainz-api.onrender.com');

/**
 * Optimizador de requests con compresión y cache inteligente
 */
export const RequestOptimizer = {
  // Comprimir parámetros de query largos
  compressParams: (params) => {
    if (!params || Object.keys(params).length === 0) return params;
    
    const compressed = {};
    Object.keys(params).forEach(key => {
      const value = params[key];
      
      // Comprimir arrays largos
      if (Array.isArray(value) && value.length > 10) {
        compressed[key] = value.slice(0, 10); // Limitar a 10 elementos
        logger.debug(`Compressed array parameter ${key} from ${value.length} to ${compressed[key].length}`);
      } else if (typeof value === 'string' && value.length > 100) {
        compressed[key] = value.substring(0, 100); // Limitar strings largos
        logger.debug(`Compressed string parameter ${key}`);
      } else {
        compressed[key] = value;
      }
    });
    
    return compressed;
  },
  
  // Cachear requests inteligentemente
  getCacheStrategy: (endpoint, params) => {
    const strategies = {
      '/exercises': { ttl: 30 * 60 * 1000, priority: 'high' },      // 30 minutos
      '/muscles': { ttl: 60 * 60 * 1000, priority: 'high' },        // 1 hora
      '/equipment': { ttl: 60 * 60 * 1000, priority: 'high' },      // 1 hora
      '/search': { ttl: 15 * 60 * 1000, priority: 'medium' },       // 15 minutos
      '/exercise/': { ttl: 45 * 60 * 1000, priority: 'high' },      // 45 minutos
    };
    
    const strategy = Object.keys(strategies).find(key => endpoint.includes(key));
    return strategy ? strategies[strategy] : { ttl: 10 * 60 * 1000, priority: 'low' };
  },
  
  // Batch multiple requests
  batchRequests: async (requests) => {
    logger.info(`Batching ${requests.length} requests`);
    
    // Ejecutar requests en paralelo con límite
    const BATCH_SIZE = 3;
    const results = [];
    
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (request, index) => {
        try {
          return await request();
        } catch (error) {
          logger.error(`Batch request ${i + index} failed:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Pequeña pausa entre batches para no sobrecargar
      if (i + BATCH_SIZE < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
};

/**
 * Preloader inteligente para datos críticos
 */
export class DataPreloader {
  constructor(apiService) {
    this.apiService = apiService;
    this.preloadQueue = new Set();
    this.isPreloading = false;
  }
  
  // Prelanzar datos críticos en background
  async preloadCriticalData(userPreferences = null) {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    logger.info('Starting critical data preload');
    
    try {
      // Verificar conectividad
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        logger.info('Preload skipped: device offline');
        return;
      }
      
      const preloadTasks = [
        () => this.apiService.getAllMuscles(),
        () => this.apiService.getAllEquipment(),
      ];
      
      // Si tenemos preferencias de usuario, precargar ejercicios relevantes
      if (userPreferences) {
        if (userPreferences.bodyFocus?.length > 0) {
          userPreferences.bodyFocus.forEach(muscle => {
            preloadTasks.push(() => this.apiService.getExercisesByMuscle(muscle));
          });
        }
        
        if (userPreferences.equipment?.length > 0) {
          userPreferences.equipment.slice(0, 2).forEach(equipment => {
            preloadTasks.push(() => this.apiService.getExercisesByEquipment(equipment));
          });
        }
      }
      
      // Ejecutar preload en batches
      await RequestOptimizer.batchRequests(preloadTasks);
      logger.info('Critical data preload completed');
      
    } catch (error) {
      logger.error('Preload failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }
  
  // Precargar ejercicio específico y relacionados
  async preloadExerciseDetails(exerciseId, muscle) {
    const preloadTasks = [
      () => this.apiService.getExerciseById(exerciseId),
    ];
    
    // Precargar ejercicios similares
    if (muscle) {
      preloadTasks.push(() => this.apiService.getExercisesByMuscle(muscle));
    }
    
    try {
      await RequestOptimizer.batchRequests(preloadTasks);
      logger.debug(`Preloaded exercise ${exerciseId} and related data`);
    } catch (error) {
      logger.warn(`Failed to preload exercise ${exerciseId}:`, error);
    }
  }
}

/**
 * Monitor de performance de API
 */
export class APIPerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      successRate: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      failures: []
    };
  }
  
  recordRequest(endpoint, duration, success, fromCache = false) {
    this.metrics.requests++;
    
    if (success) {
      // Actualizar tiempo promedio de respuesta
      const currentAvg = this.metrics.averageResponseTime;
      this.metrics.averageResponseTime = (currentAvg + duration) / 2;
      
      if (fromCache) {
        this.metrics.cacheHitRate = 
          ((this.metrics.cacheHitRate * (this.metrics.requests - 1)) + 1) / this.metrics.requests;
      }
    } else {
      this.metrics.failures.push({
        endpoint,
        timestamp: Date.now(),
        duration
      });
    }
    
    // Calcular success rate
    const successes = this.metrics.requests - this.metrics.failures.length;
    this.metrics.successRate = (successes / this.metrics.requests) * 100;
  }
  
  getReport() {
    return {
      ...this.metrics,
      recentFailures: this.metrics.failures.slice(-5) // últimos 5 fallos
    };
  }
  
  shouldShowPerformanceWarning() {
    return this.metrics.successRate < 80 || this.metrics.averageResponseTime > 10000;
  }
}

export const performanceMonitor = new APIPerformanceMonitor();

/**
 * Tips para optimizar tu API en Render
 */
export const RENDER_OPTIMIZATION_TIPS = `
🚀 TIPS PARA OPTIMIZAR TU API EN RENDER:

1. BACKEND (en tu API):
   - Implementa endpoint /health para keep-alive
   - Usa Redis para cache (Render Redis gratuito)
   - Implementa compresión gzip
   - Limita resultados por defecto (paginación)
   - Usa indexes en tu base de datos

2. CONFIGURACIÓN:
   - Habilita "Auto-Deploy" desde GitHub
   - Usa variables de entorno para configuración
   - Considera upgrade a plan pagado si necesitas 24/7

3. MONITOREO:
   - Usa Render Dashboard para ver métricas
   - Implementa logging básico
   - Monitor de tiempo de respuesta

4. CÓDIGO EJEMPLO para tu backend:
   app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));
   
   // Comprimir responses
   app.use(compression());
   
   // Cache headers
   app.use((req, res, next) => {
     res.set('Cache-Control', 'public, max-age=1800'); // 30 min cache
     next();
   });

5. BASE DE DATOS:
   - Si usas MongoDB: crea indexes en campos que filtras
   - Si usas PostgreSQL: usa EXPLAIN para optimizar queries
   - Limita resultados: SELECT * FROM exercises LIMIT 50
`;
