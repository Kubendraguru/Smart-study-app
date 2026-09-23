import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookOpen, GraduationCap, FileText, Eye, User } from 'lucide-react-native';
import { theme } from '@/theme';

import TeacherDashboardScreen from '@/screens/mobile/TeacherDashboardScreen';
import TeacherExamsScreen from '@/screens/mobile/TeacherExamsScreen';
import UploadPdfScreen from '@/screens/mobile/UploadPdfScreen';
import PdfTrackingScreen from '@/screens/mobile/PdfTrackingScreen';
import ProfileScreen from '@/screens/mobile/ProfileScreen';

import SubjectDetailsScreen from '@/screens/mobile/SubjectDetailsScreen';
import UnitDetailsScreen from '@/screens/mobile/UnitDetailsScreen';
import PdfViewerScreen from '@/screens/mobile/PdfViewerScreen';
import TeacherAnnouncementsScreen from '@/screens/mobile/TeacherAnnouncementsScreen';
import AddYoutubeScreen from '@/screens/mobile/AddYoutubeScreen';
import AIAssistantScreen from '@/screens/mobile/AIAssistantScreen';
import YouTubeScreen from '@/screens/mobile/YouTubeScreen';
import AddSubjectScreen from '@/screens/mobile/AddSubjectScreen';
import AddUnitScreen from '@/screens/mobile/AddUnitScreen';
import TeacherAssignmentsScreen from '@/screens/mobile/TeacherAssignmentsScreen';
import TeacherBooksScreen from '@/screens/mobile/TeacherBooksScreen';
import TeacherSettingsScreen from '@/screens/mobile/TeacherSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TeacherTabs() {
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
        name="Dashboard"
        component={TeacherDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Exams"
        component={TeacherExamsScreen}
        options={{
          tabBarLabel: 'Exams',
          tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadPdfScreen}
        options={{
          tabBarLabel: 'Upload',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Tracking"
        component={PdfTrackingScreen}
        options={{
          tabBarLabel: 'Tracking',
          tabBarIcon: ({ color, size }) => <Eye size={size} color={color} />,
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

export default function TeacherNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeacherTabs" component={TeacherTabs} />
      <Stack.Screen name="TeacherExams" component={TeacherExamsScreen} />
      <Stack.Screen name="UploadPdf" component={UploadPdfScreen} />
      <Stack.Screen name="PdfTracking" component={PdfTrackingScreen} />
      <Stack.Screen name="SubjectDetails" component={SubjectDetailsScreen} />
      <Stack.Screen name="UnitDetails" component={UnitDetailsScreen} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
      <Stack.Screen name="TeacherAnnouncements" component={TeacherAnnouncementsScreen} />
      <Stack.Screen name="AddYoutube" component={AddYoutubeScreen} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
      <Stack.Screen name="YouTube" component={YouTubeScreen} />
      <Stack.Screen name="AddSubject" component={AddSubjectScreen} />
      <Stack.Screen name="AddUnit" component={AddUnitScreen} />
      <Stack.Screen name="TeacherAssignments" component={TeacherAssignmentsScreen} />
      <Stack.Screen name="TeacherBooks" component={TeacherBooksScreen} />
      <Stack.Screen name="TeacherSettings" component={TeacherSettingsScreen} />
    </Stack.Navigator>
  );
}
