// Script de verificación para debugging de rutinas por usuario
// Solo para desarrollo - eliminar en producción
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import RoutineMigration from '../utils/routineMigration';

export class RoutineDebugger {
  
  /**
   * Mostrar todas las claves relacionadas con rutinas
   */
  static async debugAllKeys() {
    if (!__DEV__) return;
    
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const routineKeys = allKeys.filter(key => 
        key.includes('routine') || key.includes('user_routines')
      );
      
      console.group('🔍 ROUTINE DEBUG - All Keys');
      routineKeys.forEach(key => console.log(key));
      console.groupEnd();
      
      return routineKeys;
    } catch (error) {
      console.error('Error debugging keys:', error);
    }
  }
  
  /**
   * Mostrar contenido de rutinas para un usuario específico
   */
  static async debugUserRoutines(userId) {
    if (!__DEV__) return;
    
    try {
      const key = `user_routines_${userId}`;
      const data = await AsyncStorage.getItem(key);
      
      console.group(`🔍 ROUTINE DEBUG - User ${userId}`);
      if (data) {
        const routines = JSON.parse(data);
        console.log(`Total routines: ${routines.length}`);
        routines.forEach((routine, index) => {
          console.log(`${index + 1}. ${routine.name} (${routine.isCustom ? 'Custom' : 'Generated'})`);
        });
      } else {
        console.log('No routines found for this user');
      }
      console.groupEnd();
      
    } catch (error) {
      console.error('Error debugging user routines:', error);
    }
  }
  
  /**
   * Mostrar estadísticas de migración
   */
  static async debugMigrationStats() {
    if (!__DEV__) return;
    
    try {
      const stats = await RoutineMigration.getMigrationStats();
      
      console.group('🔍 MIGRATION DEBUG - Stats');
      console.log('Users completed migration:', stats.usersCompleted);
      console.log('Old system routines:', stats.oldSystemRoutines);
      console.log('New system routines:', stats.newSystemRoutines);
      console.log('Total users with routines:', stats.totalUsers);
      console.groupEnd();
      
      return stats;
    } catch (error) {
      console.error('Error debugging migration stats:', error);
    }
  }
  
  /**
   * Verificar si un usuario específico tiene rutinas aisladas correctamente
   */
  static async verifyUserIsolation(userId1, userId2) {
    if (!__DEV__) return;
    
    try {
      const { RoutineService } = await import('../services/routineService');
      
      const routines1 = await RoutineService.getUserRoutines(userId1);
      const routines2 = await RoutineService.getUserRoutines(userId2);
      
      // Verificar que no hay rutinas compartidas por ID
      const ids1 = new Set(routines1.map(r => r.id));
      const ids2 = new Set(routines2.map(r => r.id));
      const sharedIds = [...ids1].filter(id => ids2.has(id));
      
      console.group('🔍 USER ISOLATION VERIFICATION');
      console.log(`User ${userId1} has ${routines1.length} routines`);
      console.log(`User ${userId2} has ${routines2.length} routines`);
      console.log(`Shared routine IDs: ${sharedIds.length}`);
      
      if (sharedIds.length > 0) {
        console.warn('⚠️ POTENTIAL ISSUE: Users sharing routine IDs:', sharedIds);
      } else {
        console.log('✅ Users have properly isolated routines');
      }
      console.groupEnd();
      
      return {
        user1Count: routines1.length,
        user2Count: routines2.length,
        sharedIds: sharedIds.length,
        isolated: sharedIds.length === 0
      };
      
    } catch (error) {
      console.error('Error verifying user isolation:', error);
    }
  }
  
  /**
   * Ejecutar verificación completa
   */
  static async runFullCheck(currentUserId) {
    if (!__DEV__) return;
    
    console.group('🚀 ROUTINE SYSTEM FULL CHECK');
    
    // 1. Mostrar todas las claves
    await this.debugAllKeys();
    
    // 2. Mostrar rutinas del usuario actual
    await this.debugUserRoutines(currentUserId);
    
    // 3. Mostrar estadísticas de migración
    await this.debugMigrationStats();
    
    // 4. Verificar aislamiento si hay múltiples usuarios
    const allKeys = await AsyncStorage.getAllKeys();
    const userKeys = allKeys.filter(key => key.startsWith('user_routines_') && key !== 'user_routines_default_user');
    
    if (userKeys.length > 1) {
      console.log('Multiple users detected, checking isolation...');
      const userIds = userKeys.map(key => key.replace('user_routines_', ''));
      if (userIds.length >= 2) {
        await this.verifyUserIsolation(userIds[0], userIds[1]);
      }
    }
    
    console.groupEnd();
  }
}

// Solo exportar en desarrollo
export default __DEV__ ? RoutineDebugger : null;
