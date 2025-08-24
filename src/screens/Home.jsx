import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { globalStyles, colors, spacing } from '../styles/globalStyles';
import { useAuth } from '../contexts/AuthContext';

const Home = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Get user name from auth context or use a default
  const userName = user?.displayName || 'Usuario';
  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const quickActions = [
    {
      id: 1,
      title: 'Explorar Ejercicios',
      icon: '🏋️‍♂️',
      color: colors.primary,
      onPress: () => navigation.navigate('LibraryTab'),
    },
    {
      id: 2,
      title: 'Ver Rutinas',
      icon: '💪',
      color: colors.info,
      onPress: () => navigation.navigate('RoutinesTab'),
    },
    {
      id: 3,
      title: 'Configuración',
      icon: '⚙️',
      color: colors.success,
      onPress: () => navigation.navigate('ProfileTab'),
    },
  ];

  const statsCards = [
    {
      title: 'Ejercicios Disponibles',
      value: '20+', // Número aproximado de tu API
      icon: '🏋️‍♂️',
    },
    {
      title: 'Rutinas',
      value: '5', // Pecho, Espalda, Hombros, Piernas, Brazos, Abdominales
      icon: '💪',
    },
    {
      title: 'Versión',
      value: 'v2',
      icon: '🚀',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <View style={globalStyles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with greeting */}
        <View style={[styles.headerContainer, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{userName}! 💪</Text>
            <Text style={styles.date}>{currentDate}</Text>
          </View>
          
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContainer}
          >
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.quickActionCard, { borderColor: action.color }]}
                onPress={action.onPress}
              >
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stats Cards */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Estadísticas de Gainz v2</Text>
          <View style={styles.statsContainer}>
            {statsCards.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={styles.statNumber}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Motivation Quote */}
        <View style={[styles.sectionContainer, styles.motivationContainer]}>
          <Text style={styles.motivationQuote}>
            "El éxito no es definitivo, el fracaso no es fatal: es el coraje de continuar lo que cuenta."
          </Text>
          <Text style={styles.motivationAuthor}>- Winston Churchill</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  date: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  profileButton: {
    padding: spacing.xs,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  quickActionsContainer: {
    paddingHorizontal: spacing.lg,
  },
  quickActionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  quickActionTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  workoutCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  workoutIconText: {
    fontSize: 20,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  workoutDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  workoutArrow: {
    paddingLeft: spacing.sm,
  },
  arrowText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  motivationContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  motivationQuote: {
    fontSize: 16,
    color: colors.textPrimary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  motivationAuthor: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default Home;