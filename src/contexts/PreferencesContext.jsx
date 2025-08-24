import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserPreferencesService } from '../services/userPreferencesService';
import { logger } from '../utils/logger';
import NetInfo from '@react-native-community/netinfo';

// Crear contexto
const PreferencesContext = createContext();

// Provider component
export const PreferencesProvider = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected && state.isInternetReachable !== false;
      
      setIsOnline(nowOnline);
      
      // If we just came back online, sync pending data
      if (wasOffline && nowOnline && user) {
        logger.info('Device back online, syncing preferences...');
        syncUserData();
      }
    });

    return () => unsubscribe();
  }, [isOnline, user]);

  // Load preferences when user changes
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    } else {
      setPreferences(null);
      setLoading(false);
    }
  }, [user]);

  /**
   * Sincronizar datos cuando vuelva la conectividad
   */
  const syncUserData = async () => {
    if (!user) return;
    
    try {
      const synced = await UserPreferencesService.syncPendingData(user.uid);
      if (synced) {
        // Reload preferences after sync
        await loadUserPreferences();
        logger.info('Preferences synchronized successfully');
      }
    } catch (err) {
      logger.error('Error syncing user data:', err);
    }
  };

  /**
   * Cargar preferencias del usuario
   */
  const loadUserPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userPrefs = await UserPreferencesService.getUserPreferences(user.uid);
      
      if (userPrefs) {
        setPreferences(userPrefs);
        logger.info('Preferences loaded successfully');
      } else {
        // Si no hay preferencias, usar las por defecto
        const defaultPrefs = UserPreferencesService.getDefaultPreferences();
        setPreferences(defaultPrefs);
        logger.info('Using default preferences');
      }
    } catch (err) {
      logger.error('Error loading user preferences:', err);
      setError('Error al cargar preferencias');
      
      // Usar preferencias por defecto en caso de error
      const defaultPrefs = UserPreferencesService.getDefaultPreferences();
      setPreferences(defaultPrefs);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar preferencias
   */
  const updatePreferences = async (updates) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      
      const updatedPrefs = await UserPreferencesService.updateUserPreferences(
        user.uid, 
        updates
      );
      
      setPreferences(updatedPrefs);
      logger.info('Preferences updated successfully');
      return updatedPrefs;
    } catch (err) {
      logger.error('Error updating preferences:', err);
      setError('Error al actualizar preferencias');
      throw err;
    }
  };

  /**
   * Guardar preferencias completas (usado en quiz)
   */
  const savePreferences = async (newPreferences) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      
      const savedPrefs = await UserPreferencesService.saveUserPreferences(
        user.uid, 
        newPreferences
      );
      
      setPreferences(savedPrefs);
      logger.info('Preferences saved successfully');
      return savedPrefs;
    } catch (err) {
      logger.error('Error saving preferences:', err);
      setError('Error al guardar preferencias');
      throw err;
    }
  };

  /**
   * Verificar si el quiz fue completado
   */
  const hasCompletedQuiz = async () => {
    if (!user) return false;
    
    try {
      return await UserPreferencesService.hasCompletedQuiz(user.uid);
    } catch (err) {
      logger.error('Error checking quiz completion:', err);
      return false;
    }
  };

  /**
   * Resetear quiz
   */
  const resetQuiz = async () => {
    if (!user) return;
    
    try {
      await UserPreferencesService.resetQuiz(user.uid);
      logger.info('Quiz reset from context');
    } catch (err) {
      logger.error('Error resetting quiz:', err);
      throw err;
    }
  };

  /**
   * Obtener filtros activos basados en preferencias para tu API
   */
  const getActiveFilters = () => {
    if (!preferences) return {};

    // Mapear las preferencias del usuario a los filtros de tu API
    const apiMuscleMapping = {
      'chest': 'Pecho',
      'back': 'Espalda', 
      'shoulders': 'Hombros',
      'arms': 'Brazos',
      'legs': 'Piernas',
      'abs': 'Abdominales',
    };

    const apiEquipmentMapping = {
      'dumbbells': 'Mancuernas',
      'barbell': 'Barra',
      'machines': 'Máquina',
      'pullup': 'Peso corporal',
      'resistance': 'Peso corporal',
      'bodyweight': 'Peso corporal',
    };

    const apiDifficultyMapping = {
      'beginner': 'Principiante',
      'intermediate': 'Intermedio',
      'advanced': 'Avanzado',
    };

    return {
      bodyFocus: preferences.bodyFocus?.map(part => apiMuscleMapping[part] || part) || [],
      equipment: preferences.equipment?.map(eq => apiEquipmentMapping[eq] || eq) || [],
      experience: apiDifficultyMapping[preferences.experience] || 'Intermedio',
      goals: preferences.goals || [],
      timeLimit: parseInt(preferences.timePerWorkout) || 60,
      gymType: preferences.gymType || '',
      // Campos originales para referencia
      originalBodyFocus: preferences.bodyFocus || [],
      originalEquipment: preferences.equipment || [],
      originalExperience: preferences.experience || 'beginner',
    };
  };

  /**
   * Verificar si tiene preferencias válidas
   */
  const hasValidPreferences = () => {
    return preferences && preferences.completedAt && (
      preferences.bodyFocus?.length > 0 ||
      preferences.goals?.length > 0 ||
      preferences.equipment?.length > 0
    );
  };

  // Limpiar error
  const clearError = () => setError(null);

  // Valor del contexto
  const value = {
    preferences,
    loading,
    error,
    isOnline,
    updatePreferences,
    savePreferences,
    loadUserPreferences,
    hasCompletedQuiz,
    resetQuiz,
    getActiveFilters,
    hasValidPreferences,
    clearError,
    syncUserData,
    
    // Helpers rápidos para componentes
    isQuizCompleted: preferences?.completedAt ? true : false,
    userBodyFocus: preferences?.bodyFocus || [],
    userGoals: preferences?.goals || [],
    userEquipment: preferences?.equipment || [],
    userExperience: preferences?.experience || 'beginner',
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

export default PreferencesContext;
