import React, { useEffect } from "react";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from "./src/AppNavigator";
import { AuthProvider } from "./src/contexts/AuthContext";
import { PreferencesProvider } from "./src/contexts/PreferencesContext";
import ConnectivityNotification from "./src/components/ConnectivityNotification";
import { disableProductionLogs } from "./src/utils/logger";
import { cleanupFirestoreListeners } from "./src/api/firebase";
import "./src/utils/errorHandler"; // Inicializar manejo de errores

// Deshabilitar logs innecesarios en producción
disableProductionLogs();

export default function App() {
  useEffect(() => {
    // Cleanup listeners cuando la app se cierre
    return () => {
      cleanupFirestoreListeners();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <AppNavigator />
          <ConnectivityNotification />
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}