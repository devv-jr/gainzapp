// Sistema de manejo de errores para producción
import { logger } from './logger';

class ErrorHandler {
  constructor() {
    this.setupGlobalErrorHandlers();
  }

  setupGlobalErrorHandlers() {
    // Manejar errores no capturados de JavaScript
    if (typeof global !== 'undefined') {
      global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
        logger.error('Global JavaScript Error:', {
          error: error.message,
          stack: error.stack,
          isFatal
        });
        
        // En desarrollo, lanzar el error para debugging
        if (__DEV__) {
          throw error;
        }
      });
    }

    // Manejar promesas rechazadas no capturadas
    if (typeof global !== 'undefined' && global.addEventListener) {
      global.addEventListener('unhandledRejection', (event) => {
        logger.error('Unhandled Promise Rejection:', {
          reason: event.reason,
          promise: event.promise
        });
        
        // Prevenir que el error se propague en producción
        if (!__DEV__) {
          event.preventDefault();
        }
      });
    }
  }

  // Wrapper para funciones async que pueden fallar
  static wrapAsync(fn, context = 'Unknown') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        logger.error(`Error in ${context}:`, error);
        throw error;
      }
    };
  }

  // Wrapper para funciones síncronas que pueden fallar
  static wrapSync(fn, context = 'Unknown') {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        logger.error(`Error in ${context}:`, error);
        throw error;
      }
    };
  }

  // Reportar errores de conectividad
  static reportConnectivityError(error, context) {
    const connectivityError = {
      type: 'connectivity',
      context,
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    logger.error('Connectivity Error:', connectivityError);
  }

  // Reportar errores de API
  static reportAPIError(error, endpoint, method = 'GET') {
    const apiError = {
      type: 'api',
      endpoint,
      method,
      status: error.response?.status,
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    logger.error('API Error:', apiError);
  }

  // Reportar errores de autenticación
  static reportAuthError(error, action) {
    const authError = {
      type: 'authentication',
      action,
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    logger.error('Auth Error:', authError);
  }
}

// Instanciar el manejador de errores globalmente
const errorHandler = new ErrorHandler();

export default ErrorHandler;
