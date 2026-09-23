import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import RootNavigator from '@/navigation/RootNavigator';
import { setupNotificationHandler, requestNotificationPermissions } from '@/service/notifications';
import { syncStudentExamNotifications } from '@/service/exam';
import { getStudentNotificationSettings } from '@/service/hydration';
import { scheduleHydrationReminders } from '@/service/notifications';

function AppContent() {
  const { user, role } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 1. Initialize notification handler and request permissions
    setupNotificationHandler();
    requestNotificationPermissions();

    // 2. Setup foreground sync listener
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has returned to the foreground
        if (user && role === 'student') {
          try {
            // Synchronize exam reminders with latest database schedules
            await syncStudentExamNotifications(user.id);

            // Refresh rolling hydration schedule
            const settings = await getStudentNotificationSettings(user.id);
            if (settings.hydration_enabled) {
              await scheduleHydrationReminders(settings);
            }
          } catch (err) {
            console.warn('Foreground notification sync notice:', err);
          }
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial sync on mount if student already logged in
    if (user && role === 'student') {
      syncStudentExamNotifications(user.id);
      getStudentNotificationSettings(user.id).then((settings) => {
        if (settings.hydration_enabled) {
          scheduleHydrationReminders(settings);
        }
      });
    }

    return () => {
      subscription.remove();
    };
  }, [user, role]);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
