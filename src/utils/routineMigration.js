// Migración para separar rutinas compartidas por usuario
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

/**
 * Migración para convertir el sistema de rutinas compartidas a rutinas por usuario
 * Solo se ejecuta una vez por usuario
 */
export class RoutineMigration {
  
  static MIGRATION_KEY = 'routine_migration_completed_v1';
  
  /**
   * Verificar si la migración ya fue ejecutada para este usuario
   */
  static async isMigrationCompleted(userId) {
    try {
      const completed = await AsyncStorage.getItem(`${this.MIGRATION_KEY}_${userId}`);
      return completed === 'true';
    } catch (error) {
      logger.error('Error checking migration status:', error);
      return false;
    }
  }
  
  /**
   * Marcar migración como completada
   */
  static async markMigrationCompleted(userId) {
    try {
      await AsyncStorage.setItem(`${this.MIGRATION_KEY}_${userId}`, 'true');
      logger.info(`Routine migration marked as completed for user ${userId}`);
    } catch (error) {
      logger.error('Error marking migration as completed:', error);
    }
  }
  
  /**
   * Migrar rutinas compartidas a rutinas específicas por usuario
   */
  static async migrateUserRoutines(userId) {
    try {
      // Verificar si ya se ejecutó la migración
      const migrationCompleted = await this.isMigrationCompleted(userId);
      if (migrationCompleted) {
        logger.info(`Migration already completed for user ${userId}`);
        return;
      }
      
      logger.info(`Starting routine migration for user ${userId}`);
      
      // Obtener rutinas del sistema antiguo (default_user)
      const oldKey = 'user_routines_default_user';
      const oldRoutinesData = await AsyncStorage.getItem(oldKey);
      
      if (!oldRoutinesData) {
        logger.info('No old routines found to migrate');
        await this.markMigrationCompleted(userId);
        return;
      }
      
      const oldRoutines = JSON.parse(oldRoutinesData);
      
      // Obtener rutinas existentes del usuario
      const newKey = `user_routines_${userId}`;
      const existingData = await AsyncStorage.getItem(newKey);
      const existingRoutines = existingData ? JSON.parse(existingData) : [];
      
      // Filtrar rutinas que no existan ya para este usuario
      const routinesToMigrate = [];
      const existingNames = new Set(existingRoutines.map(r => r.name));
      
      for (const routine of oldRoutines) {
        if (!existingNames.has(routine.name)) {
          // Crear una copia de la rutina con metadatos actualizados
          const migratedRoutine = {
            ...routine,
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9), // Nuevo ID único
            migratedAt: new Date().toISOString(),
            originalId: routine.id, // Preservar referencia al ID original
            updatedAt: new Date().toISOString()
          };
          routinesToMigrate.push(migratedRoutine);
        }
      }
      
      if (routinesToMigrate.length > 0) {
        // Combinar rutinas existentes con las migradas
        const combinedRoutines = [...existingRoutines, ...routinesToMigrate];
        
        // Guardar las rutinas en la nueva clave del usuario
        await AsyncStorage.setItem(newKey, JSON.stringify(combinedRoutines));
        
        logger.info(`Migrated ${routinesToMigrate.length} routines for user ${userId}`);
        logger.debug('Migrated routines:', routinesToMigrate.map(r => r.name));
      } else {
        logger.info(`No new routines to migrate for user ${userId}`);
      }
      
      // Marcar migración como completada
      await this.markMigrationCompleted(userId);
      
      return {
        migrated: routinesToMigrate.length,
        existing: existingRoutines.length,
        total: (existingRoutines.length + routinesToMigrate.length)
      };
      
    } catch (error) {
      logger.error(`Error during routine migration for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Limpiar datos del sistema antiguo (solo después de confirmar que todos los usuarios han migrado)
   * USAR CON PRECAUCIÓN - Esta función elimina datos permanentemente
   */
  static async cleanupOldRoutineData() {
    try {
      logger.warn('Starting cleanup of old routine data - THIS WILL DELETE DATA PERMANENTLY');
      
      const keysToClean = [
        'user_routines_default_user',
        'routine_history_default_user',
        'favorite_routines_default_user'
      ];
      
      for (const key of keysToClean) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          await AsyncStorage.removeItem(key);
          logger.info(`Cleaned up old data: ${key}`);
        }
      }
      
      logger.info('Old routine data cleanup completed');
      
    } catch (error) {
      logger.error('Error during cleanup of old routine data:', error);
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas de migración
   */
  static async getMigrationStats() {
    try {
      // Contar usuarios que han completado la migración
      const keys = await AsyncStorage.getAllKeys();
      const migrationKeys = keys.filter(key => key.startsWith(this.MIGRATION_KEY));
      
      // Contar rutinas en el sistema antiguo
      const oldRoutinesData = await AsyncStorage.getItem('user_routines_default_user');
      const oldRoutinesCount = oldRoutinesData ? JSON.parse(oldRoutinesData).length : 0;
      
      // Contar rutinas en el sistema nuevo
      const userRoutineKeys = keys.filter(key => key.startsWith('user_routines_') && key !== 'user_routines_default_user');
      let newRoutinesCount = 0;
      
      for (const key of userRoutineKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          newRoutinesCount += JSON.parse(data).length;
        }
      }
      
      return {
        usersCompleted: migrationKeys.length,
        oldSystemRoutines: oldRoutinesCount,
        newSystemRoutines: newRoutinesCount,
        totalUsers: userRoutineKeys.length
      };
      
    } catch (error) {
      logger.error('Error getting migration stats:', error);
      return null;
    }
  }
}

export default RoutineMigration;
