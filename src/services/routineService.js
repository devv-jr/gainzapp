import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { getAllExercises, searchExercises } from './exerciseApi';

// Keys para AsyncStorage
const STORAGE_KEYS = {
  USER_ROUTINES: 'user_routines_',
  ROUTINE_HISTORY: 'routine_history_',
  FAVORITE_ROUTINES: 'favorite_routines_',
  ROUTINE_TEMPLATES: 'routine_templates',
};

/**
 * Servicio para manejar rutinas de entrenamiento
 */
export class RoutineService {
  
  // ===== GESTIÓN DE RUTINAS =====
  
  /**
   * Obtener todas las rutinas del usuario
   */
  static async getUserRoutines(userId) {
    try {
      const key = STORAGE_KEYS.USER_ROUTINES + userId;
      const routines = await AsyncStorage.getItem(key);
      return routines ? JSON.parse(routines) : [];
    } catch (error) {
      logger.error('Error getting user routines:', error);
      return [];
    }
  }

  /**
   * Guardar una rutina nueva
   */
  static async saveRoutine(userId, routine) {
    try {
      const routines = await this.getUserRoutines(userId);
      const newRoutine = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timesCompleted: 0,
        lastCompleted: null,
        isCustom: true,
        ...routine
      };
      
      routines.push(newRoutine);
      
      const key = STORAGE_KEYS.USER_ROUTINES + userId;
      await AsyncStorage.setItem(key, JSON.stringify(routines));
      
      logger.info('Routine saved:', newRoutine.name);
      return newRoutine;
    } catch (error) {
      logger.error('Error saving routine:', error);
      throw error;
    }
  }

  /**
   * Actualizar una rutina existente
   */
  static async updateRoutine(userId, routineId, updates) {
    try {
      const routines = await this.getUserRoutines(userId);
      const index = routines.findIndex(r => r.id === routineId);
      
      if (index === -1) {
        throw new Error('Rutina no encontrada');
      }
      
      routines[index] = {
        ...routines[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      const key = STORAGE_KEYS.USER_ROUTINES + userId;
      await AsyncStorage.setItem(key, JSON.stringify(routines));
      
      logger.info('Routine updated:', routines[index].name);
      return routines[index];
    } catch (error) {
      logger.error('Error updating routine:', error);
      throw error;
    }
  }

  /**
   * Eliminar una rutina
   */
  static async deleteRoutine(userId, routineId) {
    try {
      const routines = await this.getUserRoutines(userId);
      const filteredRoutines = routines.filter(r => r.id !== routineId);
      
      const key = STORAGE_KEYS.USER_ROUTINES + userId;
      await AsyncStorage.setItem(key, JSON.stringify(filteredRoutines));
      
      logger.info('Routine deleted:', routineId);
      return true;
    } catch (error) {
      logger.error('Error deleting routine:', error);
      throw error;
    }
  }

  // ===== RUTINAS PERSONALIZADAS BASADAS EN QUIZ =====
  
  /**
   * Generar rutinas personalizadas basadas en las respuestas del quiz
   */
  static async generatePersonalizedRoutines(userId, quizAnswers) {
    try {
      logger.info('Generating personalized routines for user:', userId);
      logger.info('Quiz answers:', JSON.stringify(quizAnswers, null, 2));
      
      // Obtener todos los ejercicios para filtrar
      const allExercises = await getAllExercises();
      logger.info(`Found ${allExercises.length} exercises from API`);
      
      if (allExercises.length === 0) {
        logger.warn('No exercises available from API');
        return [];
      }
      
      const routines = [];
      const { equipment, experience, goals, workoutFrequency, timePerWorkout, bodyFocus, gymType } = quizAnswers;
      
      // Rutina 1: Cuerpo Completo (ideal para principiantes)
      if (experience === 'beginner' || parseInt(workoutFrequency) <= 3) {
        logger.info('Creating full body routine');
        const fullBodyRoutine = await this._createFullBodyRoutine(allExercises, quizAnswers);
        if (fullBodyRoutine) {
          routines.push(fullBodyRoutine);
          logger.info('Full body routine created successfully');
        } else {
          logger.warn('Failed to create full body routine');
        }
      }
      
      // Rutina 2: Push/Pull/Legs (para intermedios/avanzados)
      if (experience !== 'beginner' && parseInt(workoutFrequency) >= 3) {
        logger.info('Creating push/pull/legs routines');
        const pushPullLegs = await this._createPushPullLegsRoutines(allExercises, quizAnswers);
        if (pushPullLegs.length > 0) {
          routines.push(...pushPullLegs);
          logger.info(`Created ${pushPullLegs.length} push/pull/legs routines`);
        } else {
          logger.warn('Failed to create push/pull/legs routines');
        }
      }
      
      // Rutina 3: Enfoque específico (basado en bodyFocus)
      if (bodyFocus && bodyFocus.length > 0) {
        logger.info('Creating focus routine for:', bodyFocus);
        const focusRoutine = await this._createFocusRoutine(allExercises, quizAnswers);
        if (focusRoutine) {
          routines.push(focusRoutine);
          logger.info('Focus routine created successfully');
        } else {
          logger.warn('Failed to create focus routine');
        }
      }
      
      // Rutina 4: Cardio/HIIT (si el objetivo incluye pérdida de peso)
      if (goals && (goals.includes('weight_loss') || goals.includes('endurance'))) {
        logger.info('Creating cardio routine');
        const cardioRoutine = await this._createCardioRoutine(allExercises, quizAnswers);
        if (cardioRoutine) {
          routines.push(cardioRoutine);
          logger.info('Cardio routine created successfully');
        } else {
          logger.warn('Failed to create cardio routine');
        }
      }

      // Guardar las rutinas generadas
      for (const routine of routines) {
        await this.saveRoutine(userId, { ...routine, isGenerated: true, isCustom: false });
      }

      logger.info(`Generated ${routines.length} personalized routines`);
      return routines;
    } catch (error) {
      logger.error('Error generating personalized routines:', error);
      throw error;
    }
  }

  /**
   * Crear rutina de cuerpo completo
   */
  static async _createFullBodyRoutine(allExercises, quizAnswers) {
    try {
      const { equipment, timePerWorkout, experience } = quizAnswers;
      
      // Filtrar ejercicios por equipamiento disponible
      const availableExercises = this._filterExercisesByEquipment(allExercises, equipment);
      logger.info(`Filtered to ${availableExercises.length} exercises by equipment:`, equipment);
      
      if (availableExercises.length === 0) {
        logger.warn('No exercises available after equipment filtering');
        return null;
      }
      
      // Seleccionar ejercicios para cada grupo muscular principal
      const selectedExercises = [];
      const muscleGroups = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos'];
      
      for (const muscle of muscleGroups) {
        const muscleExercises = availableExercises.filter(ex => 
          ex.muscle.toLowerCase().includes(muscle.toLowerCase()) ||
          (ex.primaryMuscles && ex.primaryMuscles.some(m => m.toLowerCase().includes(muscle.toLowerCase())))
        );
        
        logger.info(`Found ${muscleExercises.length} exercises for muscle group: ${muscle}`);
        
        if (muscleExercises.length > 0) {
          // Seleccionar ejercicio apropiado para el nivel
          const suitableExercise = this._selectExerciseByLevel(muscleExercises, experience);
          if (suitableExercise) {
            selectedExercises.push(suitableExercise);
            logger.info(`Selected exercise for ${muscle}:`, suitableExercise.name);
          }
        }
      }
      
      // Si no encontramos suficientes ejercicios por grupo muscular, tomar los primeros disponibles
      if (selectedExercises.length < 3) {
        logger.warn(`Only found ${selectedExercises.length} exercises by muscle group, adding more from available exercises`);
        const remainingExercises = availableExercises.filter(ex => 
          !selectedExercises.some(selected => selected.id === ex.id)
        );
        
        const needed = 6 - selectedExercises.length;
        selectedExercises.push(...remainingExercises.slice(0, needed));
      }
      
      if (selectedExercises.length < 3) {
        logger.warn(`Still not enough exercises (${selectedExercises.length}), cannot create routine`);
        return null;
      }
      
      logger.info(`Creating full body routine with ${selectedExercises.length} exercises`);
      
      return {
        id: 'fullbody_' + Date.now(),
        name: 'Rutina Cuerpo Completo Personalizada',
        description: 'Rutina diseñada específicamente para ti basada en tu perfil',
        category: 'Personalizada',
        difficulty: this._mapExperienceToDifficulty(experience),
        estimatedTime: timePerWorkout + ' min',
        totalExercises: selectedExercises.length,
        muscle: 'Todo el cuerpo',
        exercises: selectedExercises,
        workoutPlan: this._createWorkoutPlan(selectedExercises, timePerWorkout, experience),
        tags: ['personalizada', 'cuerpo-completo', experience],
        featured: true,
        isGenerated: true,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error creating full body routine:', error);
      return null;
    }
  }

  /**
   * Crear rutinas Push/Pull/Legs
   */
  static async _createPushPullLegsRoutines(allExercises, quizAnswers) {
    const routines = [];
    const { equipment, timePerWorkout, experience } = quizAnswers;
    
    const availableExercises = this._filterExercisesByEquipment(allExercises, equipment);
    
    // Push (Empuje): Pecho, Hombros, Tríceps
    const pushExercises = availableExercises.filter(ex => 
      ['pecho', 'hombros', 'triceps'].some(muscle => 
        ex.muscle.toLowerCase().includes(muscle) || 
        ex.name.toLowerCase().includes(muscle)
      )
    ).slice(0, 5);
    
    if (pushExercises.length >= 3) {
      routines.push({
        id: 'push_' + Date.now(),
        name: 'Push (Empuje) Personalizado',
        description: 'Rutina de empuje adaptada a tu equipamiento y nivel',
        category: 'Personalizada',
        difficulty: this._mapExperienceToDifficulty(experience),
        estimatedTime: timePerWorkout + ' min',
        totalExercises: pushExercises.length,
        muscle: 'Tren superior (empuje)',
        exercises: pushExercises,
        workoutPlan: this._createWorkoutPlan(pushExercises, timePerWorkout, experience),
        tags: ['personalizada', 'push', experience],
        isGenerated: true,
        createdAt: new Date().toISOString()
      });
    }
    
    // Pull (Tirón): Espalda, Bíceps
    const pullExercises = availableExercises.filter(ex => 
      ['espalda', 'biceps'].some(muscle => 
        ex.muscle.toLowerCase().includes(muscle) || 
        ex.name.toLowerCase().includes(muscle)
      )
    ).slice(0, 5);
    
    if (pullExercises.length >= 3) {
      routines.push({
        id: 'pull_' + Date.now() + '_1',
        name: 'Pull (Tirón) Personalizado',
        description: 'Rutina de tirón adaptada a tu equipamiento y nivel',
        category: 'Personalizada',
        difficulty: this._mapExperienceToDifficulty(experience),
        estimatedTime: timePerWorkout + ' min',
        totalExercises: pullExercises.length,
        muscle: 'Tren superior (tirón)',
        exercises: pullExercises,
        workoutPlan: this._createWorkoutPlan(pullExercises, timePerWorkout, experience),
        tags: ['personalizada', 'pull', experience],
        isGenerated: true,
        createdAt: new Date().toISOString()
      });
    }
    
    // Legs: Piernas
    const legExercises = availableExercises.filter(ex => 
      ['piernas', 'cuadriceps', 'isquiotibiales', 'gluteos'].some(muscle => 
        ex.muscle.toLowerCase().includes(muscle) || 
        ex.name.toLowerCase().includes(muscle)
      )
    ).slice(0, 5);
    
    if (legExercises.length >= 3) {
      routines.push({
        id: 'legs_' + Date.now() + '_2',
        name: 'Legs (Piernas) Personalizado',
        description: 'Rutina de piernas adaptada a tu equipamiento y nivel',
        category: 'Personalizada',
        difficulty: this._mapExperienceToDifficulty(experience),
        estimatedTime: timePerWorkout + ' min',
        totalExercises: legExercises.length,
        muscle: 'Tren inferior',
        exercises: legExercises,
        workoutPlan: this._createWorkoutPlan(legExercises, timePerWorkout, experience),
        tags: ['personalizada', 'legs', experience],
        isGenerated: true,
        createdAt: new Date().toISOString()
      });
    }
    
    return routines;
  }

  /**
   * Crear rutina de enfoque específico
   */
  static async _createFocusRoutine(allExercises, quizAnswers) {
    const { bodyFocus, equipment, timePerWorkout, experience } = quizAnswers;
    
    // Mapear focus areas del quiz a grupos musculares
    const focusMap = {
      chest: 'pecho',
      back: 'espalda', 
      shoulders: 'hombros',
      arms: ['biceps', 'triceps'],
      legs: 'piernas',
      abs: 'abdominales'
    };
    
    const availableExercises = this._filterExercisesByEquipment(allExercises, equipment);
    const selectedExercises = [];
    
    for (const focus of bodyFocus) {
      const targetMuscles = Array.isArray(focusMap[focus]) ? focusMap[focus] : [focusMap[focus]];
      
      for (const muscle of targetMuscles) {
        const muscleExercises = availableExercises.filter(ex => 
          ex.muscle.toLowerCase().includes(muscle) ||
          ex.name.toLowerCase().includes(muscle)
        );
        
        const selected = this._selectExerciseByLevel(muscleExercises, experience);
        if (selected && !selectedExercises.find(ex => ex.id === selected.id)) {
          selectedExercises.push(selected);
        }
      }
    }
    
    if (selectedExercises.length < 3) return null;
    
    const focusNames = bodyFocus.map(f => focusMap[f]).join(', ');
    
    return {
      id: 'focus_' + Date.now(),
      name: `Rutina Enfoque: ${focusNames}`,
      description: `Rutina especializada en los grupos musculares que más te interesan`,
      category: 'Personalizada',
      difficulty: this._mapExperienceToDifficulty(experience),
      estimatedTime: timePerWorkout + ' min',
      totalExercises: selectedExercises.length,
      muscle: focusNames,
      exercises: selectedExercises,
      workoutPlan: this._createWorkoutPlan(selectedExercises, timePerWorkout, experience),
      tags: ['personalizada', 'enfoque', ...bodyFocus, experience],
      isGenerated: true,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Crear rutina de cardio/HIIT
   */
  static async _createCardioRoutine(allExercises, quizAnswers) {
    const { equipment, timePerWorkout, experience, gymType } = quizAnswers;
    
    // Ejercicios de cardio básicos (muchos sin equipamiento)
    const cardioExercises = [
      {
        id: 'cardio_1',
        name: 'Jumping Jacks',
        muscle: 'Todo el cuerpo',
        equipment: 'Peso corporal',
        difficulty: 'Principiante',
        instructions: 'Salta abriendo y cerrando piernas y brazos simultáneamente'
      },
      {
        id: 'cardio_2', 
        name: 'High Knees',
        muscle: 'Piernas',
        equipment: 'Peso corporal',
        difficulty: 'Principiante',
        instructions: 'Corre en el lugar llevando las rodillas al pecho'
      },
      {
        id: 'cardio_3',
        name: 'Burpees',
        muscle: 'Todo el cuerpo',
        equipment: 'Peso corporal',
        difficulty: 'Intermedio',
        instructions: 'Combinación de sentadilla, plancha y salto vertical'
      },
      {
        id: 'cardio_4',
        name: 'Mountain Climbers',
        muscle: 'Core',
        equipment: 'Peso corporal',
        difficulty: 'Intermedio',
        instructions: 'En posición de plancha, alterna llevando las rodillas al pecho'
      },
      {
        id: 'cardio_5',
        name: 'Squat Jumps',
        muscle: 'Piernas',
        equipment: 'Peso corporal',
        difficulty: 'Intermedio',
        instructions: 'Realiza una sentadilla y explota hacia arriba con un salto'
      }
    ];
    
    // Filtrar por nivel de experiencia
    const suitableExercises = cardioExercises.filter(ex => {
      if (experience === 'beginner') return ex.difficulty === 'Principiante';
      return true;
    });
    
    return {
      id: 'hiit_' + Date.now(),
      name: 'HIIT Personalizado',
      description: 'Rutina de alta intensidad para quemar calorías y mejorar resistencia',
      category: 'Cardio',
      difficulty: this._mapExperienceToDifficulty(experience),
      estimatedTime: Math.min(parseInt(timePerWorkout), 30) + ' min',
      totalExercises: suitableExercises.length,
      muscle: 'Todo el cuerpo',
      exercises: suitableExercises,
      workoutPlan: this._createHIITWorkoutPlan(suitableExercises, timePerWorkout),
      tags: ['personalizada', 'cardio', 'hiit', experience],
      isHIIT: true,
      isGenerated: true,
      createdAt: new Date().toISOString()
    };
  }

  // ===== UTILIDADES =====
  
  /**
   * Filtrar ejercicios por equipamiento disponible
   */
  static _filterExercisesByEquipment(exercises, equipment) {
    if (!equipment || equipment.length === 0) {
      // Si no hay equipamiento especificado, incluir ejercicios de peso corporal
      logger.info('No equipment specified, including bodyweight exercises');
      return exercises.filter(exercise => {
        const eq = exercise.equipment ? exercise.equipment.toLowerCase() : '';
        return eq.includes('peso corporal') || 
               eq.includes('bodyweight') || 
               eq.includes('body weight') ||
               eq.includes('sin equipo') ||
               eq === '';
      });
    }
    
    const equipmentMap = {
      dumbbells: ['mancuernas', 'dumbbell', 'mancuerna'],
      barbell: ['barra', 'barbell', 'olimpica'],
      machines: ['máquina', 'machine', 'equipo'],
      pullup: ['dominadas', 'pullup', 'pull-up', 'barra fija'],
      resistance: ['banda', 'resistance', 'elástica', 'goma'],
      bodyweight: ['peso corporal', 'bodyweight', 'body weight', 'sin equipo', '']
    };
    
    // Siempre incluir ejercicios de peso corporal
    const bodyweightExercises = exercises.filter(exercise => {
      const eq = exercise.equipment ? exercise.equipment.toLowerCase() : '';
      return eq.includes('peso corporal') || 
             eq.includes('bodyweight') || 
             eq.includes('body weight') ||
             eq.includes('sin equipo') ||
             eq === '';
    });
    
    // Filtrar por equipamiento específico
    const equipmentExercises = exercises.filter(exercise => {
      const exerciseEquipment = exercise.equipment ? exercise.equipment.toLowerCase() : '';
      
      return equipment.some(eq => {
        const searchTerms = equipmentMap[eq] || [eq.toLowerCase()];
        return searchTerms.some(term => exerciseEquipment.includes(term));
      });
    });
    
    // Combinar y eliminar duplicados
    const allFilteredExercises = [...bodyweightExercises, ...equipmentExercises];
    const uniqueExercises = allFilteredExercises.filter((exercise, index, self) => 
      index === self.findIndex(e => e.id === exercise.id)
    );
    
    logger.info(`Filtered exercises: ${uniqueExercises.length} (${bodyweightExercises.length} bodyweight + ${equipmentExercises.length} equipment-specific)`);
    
    return uniqueExercises;
  }

  /**
   * Seleccionar ejercicio apropiado por nivel
   */
  static _selectExerciseByLevel(exercises, experience) {
    if (exercises.length === 0) return null;
    
    // Intentar encontrar ejercicio del nivel apropiado
    const difficultyMap = {
      beginner: ['principiante', 'beginner', 'easy'],
      intermediate: ['intermedio', 'intermediate', 'medium'],
      advanced: ['avanzado', 'advanced', 'hard']
    };
    
    const preferredDifficulties = difficultyMap[experience] || ['intermedio'];
    
    for (const difficulty of preferredDifficulties) {
      const suitableExercise = exercises.find(ex => 
        ex.difficulty && ex.difficulty.toLowerCase().includes(difficulty)
      );
      if (suitableExercise) return suitableExercise;
    }
    
    // Si no encuentra por dificultad, devolver el primero
    return exercises[0];
  }

  /**
   * Mapear experiencia del quiz a dificultad
   */
  static _mapExperienceToDifficulty(experience) {
    const map = {
      beginner: 'Principiante',
      intermediate: 'Intermedio', 
      advanced: 'Avanzado'
    };
    return map[experience] || 'Intermedio';
  }

  /**
   * Crear plan de entrenamiento con sets/reps
   */
  static _createWorkoutPlan(exercises, timePerWorkout, experience) {
    const timeMinutes = parseInt(timePerWorkout);
    const restTime = experience === 'beginner' ? 90 : experience === 'intermediate' ? 60 : 45;
    
    // Calcular sets y reps basado en tiempo disponible y experiencia
    let sets, reps;
    
    if (experience === 'beginner') {
      sets = timeMinutes <= 30 ? 2 : 3;
      reps = '12-15';
    } else if (experience === 'intermediate') {
      sets = timeMinutes <= 30 ? 3 : 4;
      reps = '8-12';
    } else {
      sets = timeMinutes <= 30 ? 3 : timeMinutes <= 60 ? 4 : 5;
      reps = '6-10';
    }
    
    return {
      warmup: '5-10 minutos de calentamiento dinámico',
      exercises: exercises.map((exercise, index) => ({
        ...exercise,
        sets,
        reps,
        restTime: `${restTime}s`,
        order: index + 1,
        notes: this._getExerciseNotes(exercise, experience)
      })),
      cooldown: '5-10 minutos de estiramiento estático'
    };
  }

  /**
   * Crear plan de entrenamiento HIIT
   */
  static _createHIITWorkoutPlan(exercises, timePerWorkout) {
    const timeMinutes = parseInt(timePerWorkout);
    const workTime = 30; // 30 segundos de trabajo
    const restTime = 30; // 30 segundos de descanso
    const rounds = Math.max(2, Math.min(4, Math.floor(timeMinutes / 10))); // 2-4 rondas
    
    return {
      warmup: '5 minutos de calentamiento dinámico',
      format: 'HIIT',
      workTime: `${workTime}s`,
      restTime: `${restTime}s`,
      rounds,
      exercises: exercises.map((exercise, index) => ({
        ...exercise,
        workTime: `${workTime}s`,
        restTime: `${restTime}s`,
        order: index + 1,
        notes: 'Mantén la intensidad alta durante el tiempo de trabajo'
      })),
      cooldown: '5 minutos de estiramiento y relajación'
    };
  }

  /**
   * Obtener notas específicas para el ejercicio
   */
  static _getExerciseNotes(exercise, experience) {
    const notes = [];
    
    if (experience === 'beginner') {
      notes.push('Enfócate en la técnica correcta');
      notes.push('Comienza con peso ligero');
    }
    
    if (exercise.equipment.includes('corporal')) {
      notes.push('Si es muy difícil, modifica el ejercicio');
    }
    
    if (exercise.muscle.toLowerCase().includes('espalda')) {
      notes.push('Mantén la espalda recta durante todo el movimiento');
    }
    
    return notes.join('. ');
  }

  // ===== HISTORIAL Y FAVORITOS =====
  
  /**
   * Marcar rutina como completada
   */
  static async markRoutineCompleted(userId, routineId) {
    try {
      // Actualizar contador de la rutina
      await this.updateRoutine(userId, routineId, {
        timesCompleted: (await this.getRoutineById(userId, routineId))?.timesCompleted + 1 || 1,
        lastCompleted: new Date().toISOString()
      });
      
      // Guardar en historial
      const historyKey = STORAGE_KEYS.ROUTINE_HISTORY + userId;
      const history = await AsyncStorage.getItem(historyKey);
      const historyArray = history ? JSON.parse(history) : [];
      
      historyArray.push({
        routineId,
        completedAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
      });
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(historyArray));
      
      logger.info('Routine marked as completed:', routineId);
      return true;
    } catch (error) {
      logger.error('Error marking routine as completed:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de entrenamientos
   */
  static async getRoutineHistory(userId) {
    try {
      const historyKey = STORAGE_KEYS.ROUTINE_HISTORY + userId;
      const history = await AsyncStorage.getItem(historyKey);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      logger.error('Error getting routine history:', error);
      return [];
    }
  }

  /**
   * Obtener rutina por ID
   */
  static async getRoutineById(userId, routineId) {
    try {
      const routines = await this.getUserRoutines(userId);
      return routines.find(r => r.id === routineId);
    } catch (error) {
      logger.error('Error getting routine by ID:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas del usuario
   */
  static async getUserStats(userId) {
    try {
      const routines = await this.getUserRoutines(userId);
      const history = await this.getRoutineHistory(userId);
      
      const totalWorkouts = history.length;
      const totalRoutines = routines.length;
      const customRoutines = routines.filter(r => r.isCustom).length;
      
      // Calcular streak actual
      const sortedHistory = history.sort((a, b) => new Date(b.date) - new Date(a.date));
      let currentStreak = 0;
      let checkDate = new Date();
      
      for (const workout of sortedHistory) {
        const workoutDate = new Date(workout.date);
        const diffDays = Math.floor((checkDate - workoutDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1 && (currentStreak === 0 || diffDays <= 1)) {
          currentStreak++;
          checkDate = workoutDate;
        } else {
          break;
        }
      }
      
      return {
        totalWorkouts,
        totalRoutines,
        customRoutines,
        currentStreak,
        lastWorkout: sortedHistory[0]?.date || null
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      return {
        totalWorkouts: 0,
        totalRoutines: 0,
        customRoutines: 0,
        currentStreak: 0,
        lastWorkout: null
      };
    }
  }

  // ===== MÉTODOS DEPRECADOS - USAR CON userId =====
  // NOTA: Estos métodos están deprecados para evitar mezcla de datos entre usuarios
  
  /**
   * @deprecated Usar getUserRoutines(userId) en su lugar
   */
  static async getAllRoutines() {
    console.warn('DEPRECATED: getAllRoutines() - Use getUserRoutines(userId) instead');
    throw new Error('Método deprecado: usa getUserRoutines(userId) para evitar mezclar datos de usuarios');
  }

  /**
   * @deprecated Usar getUserRoutines(userId) y filtrar en su lugar
   */
  static async getCustomRoutines() {
    console.warn('DEPRECATED: getCustomRoutines() - Use getUserRoutines(userId) and filter instead');
    throw new Error('Método deprecado: usa getUserRoutines(userId) y filtra por isCustom');
  }

  /**
   * @deprecated Usar getUserRoutines(userId) y filtrar en su lugar
   */
  static async getGeneratedRoutines() {
    console.warn('DEPRECATED: getGeneratedRoutines() - Use getUserRoutines(userId) and filter instead');
    throw new Error('Método deprecado: usa getUserRoutines(userId) y filtra por isGenerated');
  }

  /**
   * Limpiar rutinas duplicadas para un usuario específico
   */
  static async cleanDuplicateRoutines(userId) {
    try {
      const allRoutines = await this.getUserRoutines(userId);
      
      // Crear un mapa para detectar duplicados por nombre
      const uniqueRoutines = new Map();
      const cleanedRoutines = [];
      
      for (const routine of allRoutines) {
        const key = routine.name + '_' + (routine.isGenerated ? 'generated' : 'custom');
        if (!uniqueRoutines.has(key)) {
          uniqueRoutines.set(key, routine);
          cleanedRoutines.push(routine);
        } else {
          logger.info('Removing duplicate routine:', routine.name);
        }
      }
      
      if (cleanedRoutines.length < allRoutines.length) {
        const key = STORAGE_KEYS.USER_ROUTINES + userId;
        await AsyncStorage.setItem(key, JSON.stringify(cleanedRoutines));
        logger.info(`Cleaned ${allRoutines.length - cleanedRoutines.length} duplicate routines for user ${userId}`);
      }
      
      return cleanedRoutines;
    } catch (error) {
      logger.error('Error cleaning duplicate routines:', error);
      throw error;
    }
  }

  /**
   * @deprecated Usar saveRoutine(userId, routine) en su lugar
   */
  static async createRoutine(routine) {
    console.warn('DEPRECATED: createRoutine() - Use saveRoutine(userId, routine) instead');
    throw new Error('Método deprecado: usa saveRoutine(userId, routine) para evitar mezclar datos de usuarios');
  }

  /**
   * Generar rutinas recomendadas basadas en el quiz para un usuario específico
   */
  static async generateRecommendedRoutines(userId) {
    try {
      // Verificar si ya existen rutinas generadas para este usuario
      const existingRoutines = await this.getUserRoutines(userId);
      const existingGenerated = existingRoutines.filter(r => r.isGenerated === true);
      
      if (existingGenerated.length > 0) {
        logger.info(`Using existing generated routines for user ${userId}`);
        return existingGenerated;
      }
      
      // Importar dinámicamente el servicio de preferencias para evitar import circular
      const { getUserPreferences } = await import('./userPreferencesService');
      
      // Obtener preferencias del usuario desde el servicio correcto
      const userPreferences = await getUserPreferences(userId);
      
      if (!userPreferences || !userPreferences.completedAt) {
        logger.info(`No quiz preferences found for user ${userId}, creating default routines`);
        // Si no hay quiz completado, crear rutinas básicas por defecto
        const defaultAnswers = {
          experience: 'intermediate',
          goals: ['muscle_gain'],
          equipment: ['dumbbells', 'bodyweight'],
          timePerWorkout: '45',
          workoutFrequency: '3',
          bodyFocus: ['chest', 'back', 'legs'],
          gymType: 'home'
        };
        return await this.generatePersonalizedRoutines(userId, defaultAnswers);
      }

      logger.info(`Found user preferences for ${userId}, generating personalized routines`);
      return await this.generatePersonalizedRoutines(userId, userPreferences);
    } catch (error) {
      logger.error(`Error generating recommended routines for user ${userId}:`, error);
      // En caso de error, devolver rutinas básicas
      try {
        const defaultAnswers = {
          experience: 'intermediate',
          goals: ['muscle_gain'],
          equipment: ['bodyweight'],
          timePerWorkout: '45',
          workoutFrequency: '3',
          bodyFocus: ['chest', 'back', 'legs'],
          gymType: 'home'
        };
        return await this.generatePersonalizedRoutines(userId, defaultAnswers);
      } catch (fallbackError) {
        logger.error(`Fallback routine generation failed for user ${userId}:`, fallbackError);
        return [];
      }
    }
  }

  /**
   * @deprecated Usar markRoutineCompleted(userId, routineId) en su lugar
   */
  static async completeRoutine(routineId, workoutData) {
    console.warn('DEPRECATED: completeRoutine() - Use markRoutineCompleted(userId, routineId) instead');
    throw new Error('Método deprecado: usa markRoutineCompleted(userId, routineId) para evitar mezclar datos de usuarios');
  }
}

// Crear y exportar instancia del servicio
const routineServiceInstance = RoutineService;

export { routineServiceInstance as routineService };
export default RoutineService;
