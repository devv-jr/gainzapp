// Production Logger - Solo registra errores críticos en producción
const isDevelopment = __DEV__;

// Logger personalizado para producción
export const logger = {
  _lastConnectionLog: null,
  _lastReconnectionLog: null,
  
  // Solo errores críticos en producción
  error: (message, ...args) => {
    if (isDevelopment) {
      console.error(message, ...args);
    }
    // En producción, podrías enviar a un servicio de logging como Sentry
  },

  // Warnings solo en desarrollo
  warn: (message, ...args) => {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
  },

  // Info solo en desarrollo con filtrado de mensajes repetitivos
  info: (message, ...args) => {
    if (isDevelopment) {
      // Filtrar logs repetitivos de conectividad
      if (message.includes('Device connectivity detected') || 
          message.includes('Device back online')) {
        const now = Date.now();
        if (!logger._lastConnectionLog || now - logger._lastConnectionLog > 5000) {
          console.log(`[INFO] ${message}`, ...args);
          logger._lastConnectionLog = now;
        }
        return;
      }
      
      if (message.includes('Firestore reconnection successful')) {
        const now = Date.now();
        if (!logger._lastReconnectionLog || now - logger._lastReconnectionLog > 10000) {
          console.log(`[INFO] ${message}`, ...args);
          logger._lastReconnectionLog = now;
        }
        return;
      }
      
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  // Debug solo en desarrollo
  debug: (message, ...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', message, ...args);
    }
  }
};

// Función para silenciar logs innecesarios en producción
export const disableProductionLogs = () => {
  if (!isDevelopment) {
    // Mantener solo console.error para errores críticos
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    // console.error se mantiene para errores críticos
  }
};