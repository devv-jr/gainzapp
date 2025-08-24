import { auth } from '../api/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { logger } from '../utils/logger';

// Register a new user
export const registerUser = async (name, email, password) => {
  try {
    logger.info('Starting user registration for:', email);
    
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    logger.info('User created successfully, updating profile...');
    
    // Update the user's profile with the display name
    await updateProfile(userCredential.user, {
      displayName: name
    });
    logger.info('Profile updated with displayName:', name);
    
    // Create a user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name,
      email,
      createdAt: new Date().toISOString(),
    });
    logger.info('User document created in Firestore');
    
    // Reload the user to get the updated profile
    await userCredential.user.reload();
    logger.info('User reloaded, final displayName:', userCredential.user.displayName);
    
    return userCredential.user;
  } catch (error) {
    logger.error('Error during registration:', error);
    throw error;
  }
};

// Login with email and password
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    logger.error('Error during login:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    logger.error('Error during logout:', error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Get user profile data
export const getUserProfile = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      logger.info('No user profile found for uid:', uid);
      return null;
    }
  } catch (error) {
    logger.error('Error getting user profile:', error);
    throw error;
  }
};
