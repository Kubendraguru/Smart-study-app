import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/theme';

import LoginScreen from '@/screens/mobile/LoginScreen';
import StudentNavigator from '@/navigation/StudentNavigator';
import TeacherNavigator from '@/navigation/TeacherNavigator';

export default function RootNavigator() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Smart Study...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (role === 'teacher') {
    return <TeacherNavigator />;
  }

  return <StudentNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
});
