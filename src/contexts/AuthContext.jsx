import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../api/firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { registerUser, loginUser, logoutUser, getUserProfile } from '../services/authService';
import { logger } from '../utils/logger';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create context
const AuthContext = createContext();

// Utility functions for better connectivity handling
const retryWithBackoff = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = 1000 * Math.pow(2, i); // Exponential backoff: 1s, 2s, 4s
      logger.warn(`Retry attempt ${i + 1} failed, waiting ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const getUserProfileWithCache = async (uid) => {
  const cacheKey = `user_profile_${uid}`;
  
  try {
    // First, try to get cached data for immediate response
    const cachedData = await AsyncStorage.getItem(cacheKey);
    let userData = null;
    
    if (cachedData) {
      userData = JSON.parse(cachedData);
      logger.info('Using cached user profile');
    }
    
    // Check connectivity before attempting Firestore
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || netInfo.isInternetReachable === false) {
      logger.warn('Device is offline, using cached profile only');
      return userData;
    }
    
    // Esperar un poco si Firestore se está reconectando
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const freshData = await getUserProfile(uid);
        if (freshData) {
          // Update cache with fresh data
          await AsyncStorage.setItem(cacheKey, JSON.stringify(freshData));
          logger.info('User profile updated from Firestore');
          logger.info('Firestore user data:', freshData);
          return {
            ...userData, // Merge with cached data
            ...freshData, // Fresh data takes precedence
          };
        }
        break; // Éxito, salir del loop
      } catch (firestoreError) {
        retryCount++;
        
        if (firestoreError.code === 'unavailable' || 
            firestoreError.message.includes('offline')) {
          
          if (retryCount < maxRetries) {
            logger.info(`Firestore unavailable, retry ${retryCount}/${maxRetries} in 2s`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            logger.info('Firestore still unavailable after retries, using cached data');
            break;
          }
        } else {
          logger.error('Failed to get fresh profile data:', firestoreError);
          break;
        }
      }
    }
    
    return userData;
  } catch (error) {
    logger.error('Error in getUserProfileWithCache:', error);
    return null;
  }
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

    // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        logger.info('User authenticated:', firebaseUser.uid);
        logger.info('Firebase displayName:', firebaseUser.displayName);
        
        try {
          // Get additional user data from Firestore with cache
          const userData = await getUserProfileWithCache(firebaseUser.uid);
          logger.info('Firestore user data:', userData);
          
          // Combine Firebase Auth user with Firestore profile data
          // Use displayName from Firebase Auth, but fallback to name from Firestore
          const combinedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || userData?.name || 'Usuario',
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            metadata: firebaseUser.metadata, // Include Firebase Auth metadata for creation time
            ...userData // This will include name, createdAt, etc from Firestore
          };
          
          logger.info('Combined user data:', combinedUser);
          logger.info('Final displayName:', combinedUser.displayName);
          
          // If displayName is missing but we have name from Firestore, update Firebase Auth
          if (!firebaseUser.displayName && userData?.name) {
            try {
              await updateProfile(firebaseUser, {
                displayName: userData.name
              });
              combinedUser.displayName = userData.name;
              logger.info('Updated Firebase Auth displayName from Firestore');
            } catch (updateError) {
              logger.warn('Failed to update Firebase Auth displayName:', updateError);
            }
          }
          
          setUser(combinedUser);
          
        } catch (error) {
          logger.error('Error loading user profile:', error);
          // Still set the user with just Firebase data if profile loading fails
          const fallbackUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Usuario',
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            metadata: firebaseUser.metadata, // Include metadata for creation time as fallback
          };
          logger.info('Using fallback user data:', fallbackUser);
          setUser(fallbackUser);
        }
      } else {
        logger.info('User not authenticated');
        setUser(null);
        // Clear any cached user data on logout
        try {
          const keys = await AsyncStorage.getAllKeys();
          const userKeys = keys.filter(key => key.startsWith('user_profile_'));
          await AsyncStorage.multiRemove(userKeys);
        } catch (error) {
          logger.error('Error clearing user cache:', error);
        }
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Register handler
  const register = async (name, email, password) => {
    try {
      setError(null);
      const user = await registerUser(name, email, password);
      return user;
    } catch (err) {
      let errorMessage = 'Error al registrar usuario';
      
      // Handle Firebase error codes con mensajes más específicos y amigables
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Ya existe una cuenta con este correo electrónico. ¿Quizás quieres iniciar sesión?';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'El formato del correo electrónico no es válido';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.';
      } else if (err.message && err.message.includes('network')) {
        errorMessage = 'Problema de conexión. Por favor verifica tu internet e intenta nuevamente.';
      }
      
      setError(errorMessage);
      throw errorMessage;
    }
  };

  // Login handler
  const login = async (email, password) => {
    try {
      setError(null);
      const user = await loginUser(email, password);
      return user;
    } catch (err) {
      let errorMessage = 'Error al iniciar sesión, por favor intenta nuevamente';
      
      // Handle Firebase error codes con mensajes más específicos y amigables
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No encontramos una cuenta con este correo electrónico. ¿Quizás necesitas registrarte?';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'La contraseña es incorrecta. Por favor revisa tu contraseña e intenta nuevamente.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'El formato del correo electrónico no es válido';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'Esta cuenta ha sido deshabilitada. Contacta al soporte técnico.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente. Intenta más tarde o restablece tu contraseña.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Las credenciales proporcionadas son incorrectas o han expirado.';
      } else if (err.message && err.message.includes('network')) {
        errorMessage = 'Problema de conexión. Por favor verifica tu internet e intenta nuevamente.';
      }
      
      setError(errorMessage);
      throw errorMessage;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      setError('Error al cerrar sesión, por favor intenta nuevamente');
      logger.error('Error during logout:', err);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Value provided to consumers of this context
  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
