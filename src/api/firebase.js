import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { 
  getFirestore, 
  enableNetwork, 
  disableNetwork,
  connectFirestoreEmulator
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo'; // Importar NetInfo
import { firebaseConfig } from './firebaseConfig';
import { logger } from '../utils/logger';

// Validar configuración de Firebase
const validateFirebaseConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Firebase config missing: ${missingKeys.join(', ')}`);
  }
};

// Validar configuración antes de inicializar
validateFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);

// Variables para controlar la reconexión
let isReconnecting = false;
let connectionListener = null;

// Función mejorada para manejar reconexión de Firestore
export const handleFirestoreReconnection = async () => {
  if (isReconnecting) {
    logger.info('Firestore reconnection already in progress, skipping...');
    return false;
  }

  try {
    isReconnecting = true;
    
    // Verificar conectividad antes de intentar reconectar
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || netInfo.isInternetReachable === false) {
      logger.warn('Device still offline, skipping reconnection');
      return false;
    }

    logger.info('Starting Firestore reconnection process...');
    
    // Deshabilitar y rehabilitar la red con timeouts más largos
    await disableNetwork(db);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Aumentar delay
    await enableNetwork(db);
    
    logger.info('Firestore reconnection successful');
    return true;
  } catch (error) {
    logger.error('Error during Firestore reconnection:', error);
    return false;
  } finally {
    isReconnecting = false;
  }
};

// Configuración para desarrollo con emulador
if (__DEV__ && typeof connectFirestoreEmulator !== 'undefined') {
  try {
    // Solo conectar al emulador si está en desarrollo y disponible
    // connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    logger.warn('Could not connect to Firestore emulator:', error);
  }
}

// Configuración mejorada para manejo de conexión
export const setupFirestoreConnectionHandling = () => {
  // Limpiar listener existente si hay uno
  if (connectionListener) {
    connectionListener();
    connectionListener = null;
  }

  let reconnectionTimeout = null;
  
  connectionListener = NetInfo.addEventListener(async (state) => {
    const isConnected = state.isConnected && state.isInternetReachable !== false;
    
    if (isConnected) {
      logger.info('Device connectivity detected');
      
      // Cancelar timeout anterior si existe
      if (reconnectionTimeout) {
        clearTimeout(reconnectionTimeout);
      }
      
      // Esperar un poco más antes de reconectar para evitar múltiples intentos
      reconnectionTimeout = setTimeout(async () => {
        if (!isReconnecting) {
          try {
            await handleFirestoreReconnection();
          } catch (error) {
            logger.error('Failed to reconnect Firestore when back online:', error);
          }
        }
      }, 2000); // Aumentar delay inicial
    } else {
      logger.info('Device went offline');
      
      // Cancelar reconexión pendiente si el dispositivo se va offline
      if (reconnectionTimeout) {
        clearTimeout(reconnectionTimeout);
        reconnectionTimeout = null;
      }
    }
  });
};

// Función para limpiar listeners (útil para cleanup)
export const cleanupFirestoreListeners = () => {
  if (connectionListener) {
    connectionListener();
    connectionListener = null;
  }
  isReconnecting = false;
};

// Ejecutar configuración de conexión solo una vez
setupFirestoreConnectionHandling();