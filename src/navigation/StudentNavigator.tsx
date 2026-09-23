import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BookOpen,
  Calendar,
  Droplets,
  GraduationCap,
  User,
  Bookmark,
  Bell,
} from 'lucide-react-native';
import { theme } from '@/theme';

import HomeScreen from '@/screens/mobile/HomeScreen';
import StudyPlannerScreen from '@/screens/mobile/StudyPlannerScreen';
import HydrationScreen from '@/screens/mobile/HydrationScreen';
import UpcomingExamsScreen from '@/screens/mobile/UpcomingExamsScreen';
import ProfileScreen from '@/screens/mobile/ProfileScreen';

import AIStudyPlanGeneratorScreen from '@/screens/mobile/AIStudyPlanGeneratorScreen';
import SavedPlansScreen from '@/screens/mobile/SavedPlansScreen';
import BookmarksScreen from '@/screens/mobile/BookmarksScreen';
import NotificationsScreen from '@/screens/mobile/NotificationsScreen';
import SubjectDetailsScreen from '@/screens/mobile/SubjectDetailsScreen';
import UnitDetailsScreen from '@/screens/mobile/UnitDetailsScreen';
import PdfViewerScreen from '@/screens/mobile/PdfViewerScreen';
import AIAssistantScreen from '@/screens/mobile/AIAssistantScreen';
import YouTubeScreen from '@/screens/mobile/YouTubeScreen';
import ArrearSubjectsScreen from '@/screens/mobile/ArrearSubjectsScreen';
import StudentAssignmentsScreen from '@/screens/mobile/StudentAssignmentsScreen';
import StudentProgressScreen from '@/screens/mobile/StudentProgressScreen';
import FocusModeScreen from '@/screens/mobile/FocusModeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Planner"
        component={StudyPlannerScreen}
        options={{
          tabBarLabel: 'Planner',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Hydration"
        component={HydrationScreen}
        options={{
          tabBarLabel: 'Water',
          tabBarIcon: ({ color, size }) => <Droplets size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Exams"
        component={UpcomingExamsScreen}
        options={{
          tabBarLabel: 'Exams',
          tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs" component={StudentTabs} />
      <Stack.Screen name="AIStudyPlanGenerator" component={AIStudyPlanGeneratorScreen} />
      <Stack.Screen name="SavedPlans" component={SavedPlansScreen} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SubjectDetails" component={SubjectDetailsScreen} />
      <Stack.Screen name="UnitDetails" component={UnitDetailsScreen} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
      <Stack.Screen name="YouTube" component={YouTubeScreen} />
      <Stack.Screen name="ArrearSubjects" component={ArrearSubjectsScreen} />
      <Stack.Screen name="StudentAssignments" component={StudentAssignmentsScreen} />
      <Stack.Screen name="StudentProgress" component={StudentProgressScreen} />
      <Stack.Screen name="FocusMode" component={FocusModeScreen} />
    </Stack.Navigator>
  );
}

