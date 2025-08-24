import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { logger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const COLLECTION_NAME = 'userPreferences';

// Utility function for retry with exponential backoff
const retryWithBackoff = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = 1000 * Math.pow(2, i);
      logger.warn(`Retry attempt ${i + 1} failed, waiting ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Check if device is online
const checkConnectivity = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable !== false;
  } catch (error) {
    logger.warn('Error checking connectivity:', error);
    return false; // Assume offline on error
  }
};

/**
 * Servicio para manejar las preferencias del usuario
 * Maneja tanto Firestore (online) como AsyncStorage (offline)
 */
export class UserPreferencesService {
  
  /**
   * Guardar preferencias del usuario (online y offline)
   */
  static async saveUserPreferences(userId, preferences) {
    const preferencesData = {
      ...preferences,
      userId,
      completedAt: new Date().toISOString(),
      version: '1.0',
      lastUpdated: new Date().toISOString(),
    };

    // Always save to AsyncStorage first (immediate backup)
    try {
      await AsyncStorage.setItem(
        `userPreferences_${userId}`, 
        JSON.stringify(preferencesData)
      );
      logger.info('Preferences saved to local storage');
    } catch (localError) {
      logger.error('Error saving preferences locally:', localError);
      // Continue trying Firestore even if local save fails
    }

    // Check connectivity before attempting Firestore
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      logger.warn('Device offline, preferences saved locally only');
      return preferencesData;
    }

    // Try to save to Firestore with retry
    try {
      await retryWithBackoff(async () => {
        await setDoc(doc(db, COLLECTION_NAME, userId), preferencesData);
      });
      logger.info('Preferences saved to Firestore successfully');
      return preferencesData;
    } catch (error) {
      logger.error('Failed to save preferences to Firestore after retries:', error);
      // Still return success since we have local backup
      logger.info('Preferences available locally, will sync when online');
      return preferencesData;
    }
  }

  /**
   * Obtener preferencias del usuario
   */
  static async getUserPreferences(userId) {
    // Always try local cache first for immediate response
    let cachedPreferences = null;
    try {
      const localData = await AsyncStorage.getItem(`userPreferences_${userId}`);
      if (localData) {
        cachedPreferences = JSON.parse(localData);
        logger.info('Found cached preferences');
      }
    } catch (localError) {
      logger.warn('Error reading local preferences:', localError);
    }

    // Check connectivity before attempting Firestore
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      logger.info('Device offline, using cached preferences only');
      return cachedPreferences;
    }

    // Try to get fresh data from Firestore with retry
    try {
      const freshPreferences = await retryWithBackoff(async () => {
        const docRef = doc(db, COLLECTION_NAME, userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return docSnap.data();
        }
        return null;
      });

      if (freshPreferences) {
        // Update local cache with fresh data
        try {
          await AsyncStorage.setItem(
            `userPreferences_${userId}`, 
            JSON.stringify(freshPreferences)
          );
          logger.info('Preferences updated from Firestore and cached locally');
        } catch (cacheError) {
          logger.warn('Failed to update local cache:', cacheError);
        }
        
        return freshPreferences;
      } else {
        logger.info('No preferences found in Firestore');
        return cachedPreferences; // Return cached if available
      }
    } catch (firestoreError) {
      logger.error('Failed to get preferences from Firestore:', firestoreError);
      
      // Fallback to cached data
      if (cachedPreferences) {
        logger.info('Using cached preferences as fallback');
        return cachedPreferences;
      }
      
      logger.info('No preferences available (online or offline)');
      return null;
    }
  }

  /**
   * Actualizar preferencias existentes
   */
  static async updateUserPreferences(userId, updates) {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      if (!currentPreferences) {
        throw new Error('No existing preferences found to update');
      }

      const updatedPreferences = {
        ...currentPreferences,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      return await this.saveUserPreferences(userId, updatedPreferences);
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Verificar si el usuario ha completado el quiz
   */
  static async hasCompletedQuiz(userId) {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences && preferences.completedAt;
    } catch (error) {
      logger.error('Error checking quiz completion:', error);
      return false;
    }
  }

  /**
   * Marcar quiz como completado (usado en UserQuiz)
   */
  static async markQuizCompleted(userId) {
    try {
      await AsyncStorage.setItem(`quiz_completed_${userId}`, 'true');
      logger.info('Quiz marked as completed');
    } catch (error) {
      logger.error('Error marking quiz as completed:', error);
    }
  }

  /**
   * Resetear quiz (permitir rehacer)
   */
  static async resetQuiz(userId) {
    try {
      await AsyncStorage.removeItem(`quiz_completed_${userId}`);
      logger.info('Quiz reset successfully');
    } catch (error) {
      logger.error('Error resetting quiz:', error);
    }
  }

  /**
   * Obtener preferencias por defecto
   */
  static getDefaultPreferences() {
    return {
      gymType: '',
      equipment: [],
      experience: 'beginner',
      goals: [],
      workoutFrequency: '3',
      timePerWorkout: '45',
      bodyFocus: [],
      completedAt: null,
    };
  }

  /**
   * Sincronizar datos locales con Firestore cuando vuelva la conectividad
   */
  static async syncPendingData(userId) {
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      logger.info('Still offline, skipping sync');
      return false;
    }

    try {
      // Get local preferences
      const localData = await AsyncStorage.getItem(`userPreferences_${userId}`);
      if (!localData) {
        logger.info('No local data to sync');
        return true;
      }

      const localPreferences = JSON.parse(localData);
      
      // Get Firestore preferences
      let firestorePreferences = null;
      try {
        const docRef = doc(db, COLLECTION_NAME, userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          firestorePreferences = docSnap.data();
        }
      } catch (error) {
        logger.warn('Could not fetch Firestore data for sync:', error);
      }

      // Determine which data is newer
      const localTimestamp = new Date(localPreferences.lastUpdated || 0).getTime();
      const firestoreTimestamp = new Date(firestorePreferences?.lastUpdated || 0).getTime();

      if (localTimestamp > firestoreTimestamp) {
        // Local data is newer, upload to Firestore
        logger.info('Syncing local data to Firestore');
        await setDoc(doc(db, COLLECTION_NAME, userId), localPreferences);
        logger.info('Sync successful: Local → Firestore');
      } else if (firestoreTimestamp > localTimestamp && firestorePreferences) {
        // Firestore data is newer, update local
        logger.info('Syncing Firestore data to local storage');
        await AsyncStorage.setItem(`userPreferences_${userId}`, JSON.stringify(firestorePreferences));
        logger.info('Sync successful: Firestore → Local');
      } else {
        logger.info('Data is already in sync');
      }

      return true;
    } catch (error) {
      logger.error('Error during sync:', error);
      return false;
    }
  }

  /**
   * Clear all cached data for a user (useful for logout)
   */
  static async clearUserCache(userId) {
    try {
      const keys = [
        `userPreferences_${userId}`,
        `quiz_completed_${userId}`,
      ];
      
      await AsyncStorage.multiRemove(keys);
      logger.info('User cache cleared successfully');
    } catch (error) {
      logger.error('Error clearing user cache:', error);
    }
  }
}

// Exportar funciones individuales para facilidad de uso
export const saveUserPreferences = UserPreferencesService.saveUserPreferences.bind(UserPreferencesService);
export const getUserPreferences = UserPreferencesService.getUserPreferences.bind(UserPreferencesService);
export const updateUserPreferences = UserPreferencesService.updateUserPreferences.bind(UserPreferencesService);
export const hasCompletedQuiz = UserPreferencesService.hasCompletedQuiz.bind(UserPreferencesService);
export const markQuizCompleted = UserPreferencesService.markQuizCompleted.bind(UserPreferencesService);
export const resetQuiz = UserPreferencesService.resetQuiz.bind(UserPreferencesService);
export const syncPendingData = UserPreferencesService.syncPendingData.bind(UserPreferencesService);
export const clearUserCache = UserPreferencesService.clearUserCache.bind(UserPreferencesService);
