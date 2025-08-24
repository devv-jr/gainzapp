import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';
import { useAuth } from '../contexts/AuthContext';

const UserQuiz = ({ navigation }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState({
    gymType: '',
    equipment: [],
    experience: '',
    goals: [],
    workoutFrequency: '',
    timePerWorkout: '',
    bodyFocus: [],
  });

  // Verificar si el quiz ya fue completado
  useEffect(() => {
    checkQuizCompletion();
  }, []);

  const checkQuizCompletion = async () => {
    try {
      const quizCompleted = await AsyncStorage.getItem(`quiz_completed_${user.uid}`);
      if (quizCompleted === 'true') {
        // Quiz ya completado, ir directamente a MainTabs
        navigation.replace('MainTabs');
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking quiz completion:', error);
      setIsLoading(false);
    }
  };

  // Definir las preguntas del quiz
  const quizSteps = [
    {
      id: 'gymType',
      question: '¿Dónde entrenas principalmente?',
      type: 'single',
      options: [
        { value: 'home', label: 'En casa', icon: '🏠' },
        { value: 'commercial', label: 'Gimnasio comercial', icon: '🏋️‍♂️' },
        { value: 'outdoor', label: 'Al aire libre', icon: '🌳' },
        { value: 'mixed', label: 'Combinado', icon: '🔄' },
      ],
    },
    {
      id: 'equipment',
      question: '¿Qué equipamiento tienes disponible?',
      type: 'multiple',
      options: [
        { value: 'dumbbells', label: 'Mancuernas', icon: '🏋️‍♂️' },
        { value: 'barbell', label: 'Barra olímpica', icon: '🏋️‍♀️' },
        { value: 'machines', label: 'Máquinas', icon: '⚙️' },
        { value: 'pullup', label: 'Barra de dominadas', icon: '🤸‍♂️' },
        { value: 'resistance', label: 'Bandas elásticas', icon: '🎯' },
        { value: 'bodyweight', label: 'Solo peso corporal', icon: '🤲' },
      ],
    },
    {
      id: 'experience',
      question: '¿Cuál es tu nivel de experiencia?',
      type: 'single',
      options: [
        { value: 'beginner', label: 'Principiante (0-6 meses)', icon: '🌱' },
        { value: 'intermediate', label: 'Intermedio (6 meses - 2 años)', icon: '💪' },
        { value: 'advanced', label: 'Avanzado (2+ años)', icon: '🏆' },
      ],
    },
    {
      id: 'goals',
      question: '¿Cuáles son tus objetivos principales?',
      type: 'multiple',
      options: [
        { value: 'strength', label: 'Ganar fuerza', icon: '💪' },
        { value: 'muscle', label: 'Ganar masa muscular', icon: '🔥' },
        { value: 'weight_loss', label: 'Perder peso', icon: '⚖️' },
        { value: 'endurance', label: 'Mejorar resistencia', icon: '🏃‍♂️' },
        { value: 'tone', label: 'Tonificar', icon: '✨' },
        { value: 'health', label: 'Salud general', icon: '❤️' },
      ],
    },
    {
      id: 'workoutFrequency',
      question: '¿Con qué frecuencia planeas entrenar?',
      type: 'single',
      options: [
        { value: '2', label: '2 veces por semana', icon: '📅' },
        { value: '3', label: '3 veces por semana', icon: '📅' },
        { value: '4', label: '4 veces por semana', icon: '📅' },
        { value: '5+', label: '5+ veces por semana', icon: '🔥' },
      ],
    },
    {
      id: 'timePerWorkout',
      question: '¿Cuánto tiempo tienes por sesión?',
      type: 'single',
      options: [
        { value: '30', label: '30 minutos', icon: '⏰' },
        { value: '45', label: '45 minutos', icon: '⏰' },
        { value: '60', label: '60 minutos', icon: '⏰' },
        { value: '90+', label: '90+ minutos', icon: '⏰' },
      ],
    },
    {
      id: 'bodyFocus',
      question: '¿En qué partes del cuerpo quieres enfocarte más?',
      type: 'multiple',
      options: [
        { value: 'chest', label: 'Pecho', icon: '💪' },
        { value: 'back', label: 'Espalda', icon: '🔙' },
        { value: 'shoulders', label: 'Hombros', icon: '🏺' },
        { value: 'arms', label: 'Brazos', icon: '💪' },
        { value: 'legs', label: 'Piernas', icon: '🦵' },
        { value: 'abs', label: 'Abdominales', icon: '🔥' },
      ],
    },
  ];

  const handleAnswer = (questionId, value) => {
    const question = quizSteps[currentStep];
    
    if (question.type === 'single') {
      setAnswers(prev => ({
        ...prev,
        [questionId]: value,
      }));
    } else {
      setAnswers(prev => {
        const currentAnswers = prev[questionId] || [];
        const isSelected = currentAnswers.includes(value);
        
        return {
          ...prev,
          [questionId]: isSelected
            ? currentAnswers.filter(item => item !== value)
            : [...currentAnswers, value],
        };
      });
    }
  };

  const handleNext = () => {
    const currentQuestion = quizSteps[currentStep];
    const currentAnswer = answers[currentQuestion.id];
    
    // Validar que haya al menos una respuesta
    if (!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) {
      Alert.alert('Respuesta requerida', 'Por favor selecciona al menos una opción');
      return;
    }

    if (currentStep < quizSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCompleteQuiz();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteQuiz = async () => {
    try {
      // Guardar las respuestas del quiz
      await AsyncStorage.setItem(`quiz_answers_${user.uid}`, JSON.stringify(answers));
      // Marcar el quiz como completado
      await AsyncStorage.setItem(`quiz_completed_${user.uid}`, 'true');
      
      Alert.alert(
        '¡Quiz completado! 🎉',
        'Hemos guardado tus preferencias. Ahora podemos personalizar tu experiencia.',
        [
          {
            text: 'Continuar',
            onPress: () => navigation.replace('MainTabs'),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving quiz data:', error);
      Alert.alert('Error', 'Hubo un problema al guardar tus respuestas. Inténtalo de nuevo.');
    }
  };

  // Mostrar loading mientras verifica si el quiz fue completado
  if (isLoading) {
    return (
      <View style={[globalStyles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { marginTop: spacing.md, textAlign: 'center' }]}>
          Configurando tu experiencia...
        </Text>
      </View>
    );
  }

  const progress = ((currentStep + 1) / quizSteps.length) * 100;
  const currentQuestion = quizSteps[currentStep];

  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar style="light" />
      
      {/* Header de bienvenida solo en el primer paso */}
      {currentStep === 0 && (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>¡Bienvenido a Gainz! 💪</Text>
          <Text style={styles.welcomeSubtitle}>
            Vamos a configurar tu experiencia personalizada con unas pocas preguntas
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header con progreso */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            disabled={currentStep === 0}
          >
            <Text style={[styles.backButtonText, currentStep === 0 && styles.disabledButton]}>
              ← Anterior
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.stepCounter}>
            {currentStep + 1} de {quizSteps.length}
          </Text>
        </View>

        {/* Barra de progreso */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {/* Pregunta */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionTitle}>{currentQuestion.question}</Text>
          
          {currentQuestion.type === 'multiple' && (
            <Text style={styles.questionSubtitle}>
              Puedes seleccionar múltiples opciones
            </Text>
          )}
        </View>

        {/* Opciones */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option) => {
            const isSelected = currentQuestion.type === 'single'
              ? answers[currentQuestion.id] === option.value
              : answers[currentQuestion.id]?.includes(option.value);

            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => handleAnswer(currentQuestion.id, option.value)}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}>
                  {option.label}
                </Text>
                
                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botón continuar */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={globalStyles.primaryButton} onPress={handleNext}>
            <Text style={globalStyles.primaryButtonText}>
              {currentStep === quizSteps.length - 1 ? 'Finalizar Configuración' : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  welcomeContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  welcomeTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    color: colors.textMuted,
  },
  stepCounter: {
    ...typography.caption,
    color: colors.textMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    marginRight: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  questionContainer: {
    marginBottom: spacing.xl,
  },
  questionTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  questionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: spacing.xl,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    color: colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    paddingBottom: spacing.xl,
  },
});

export default UserQuiz;