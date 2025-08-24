import React from "react";
import { View, ActivityIndicator } from 'react-native'; // Añadir estos imports
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import Start from "./screens/Start";
import Login from "./screens/Login";
import Register from "./screens/Register";
import Home from "./screens/Home";
import UserQuiz from './screens/UserQuiz'; // Agregar import
import Library from './screens/Library';
import Routines from './screens/Routines';
import Profile from "./screens/Profile";
import ExerciseDetail from './screens/ExerciseDetail';
import RoutineDetail from "./screens/RoutineDetail";
import CreateRoutine from './screens/CreateRoutine';
import WorkoutTracker from './screens/WorkoutTracker';
import WorkoutSummary from './screens/WorkoutSummary';
import { useAuth } from './contexts/AuthContext';
import { colors, spacing } from "./styles/globalStyles";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator Component
function MainTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          paddingTop: spacing.sm,
          height: 60 + Math.max(insets.bottom, spacing.sm),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: spacing.xs,
        },
        tabBarIconStyle: {
          marginTop: spacing.xs,
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={Home}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen 
        name="RoutinesTab" 
        component={Routines}
        options={{
          tabBarLabel: 'Rutinas',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="fitness-center" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen 
        name="LibraryTab" 
        component={Library}
        options={{
          tabBarLabel: 'Biblioteca',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen 
        name="ProfileTab" 
        component={Profile}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />

      {/* Aqui van las otras pestañas */}

    </Tab.Navigator>
  );
}

// Stack después del quiz
function AuthenticatedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserQuiz" component={UserQuiz} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="ExerciseDetail" 
        component={ExerciseDetail}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="RoutineDetail" 
        component={RoutineDetail}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="CreateRoutine" 
        component={CreateRoutine}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="WorkoutTracker" 
        component={WorkoutTracker}
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen 
        name="WorkoutSummary" 
        component={WorkoutSummary}
        options={{
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    // Mostrar un splash screen simple mientras carga
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Usuario autenticado - mostrar quiz primero, luego main app
          <Stack.Screen name="Authenticated" component={AuthenticatedStack} />
        ) : (
          // Usuario no autenticado - mostrar flujo de login
          <>
            <Stack.Screen name="Start" component={Start} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
          </>
        )}
        {/* Pueden ser accesibles desde ambos stacks */}
        <Stack.Screen 
          name="RoutineDetail" 
          component={RoutineDetail}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen 
          name="ExerciseDetail" 
          component={ExerciseDetail}
          options={{
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}