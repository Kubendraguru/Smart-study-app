import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import SplashScreen from '@/screens/student/SplashScreen';
import OnboardingScreen from '@/screens/student/OnboardingScreen';
import LoginScreen from '@/screens/student/LoginScreen';
import HomeScreen from '@/screens/student/HomeScreen';
import SemesterScreen from '@/screens/student/SemesterScreen';
import SubjectsScreen from '@/screens/student/SubjectsScreen';
import SubjectDetailsScreen from '@/screens/student/SubjectDetailsScreen';
import UnitDetailsScreen from '@/screens/student/UnitDetailsScreen';
import PdfViewerScreen from '@/screens/student/PdfViewerScreen';
import YouTubeScreen from '@/screens/student/YouTubeScreen';
import AIAssistantScreen from '@/screens/student/AIAssistantScreen';
import BookmarksScreen from '@/screens/student/BookmarksScreen';
import NotificationsScreen from '@/screens/student/NotificationsScreen';
import ProfileScreen from '@/screens/student/ProfileScreen';
import TeacherDashboardScreen from '@/screens/teacher/TeacherDashboardScreen';
import UploadPdfScreen from '@/screens/teacher/UploadPdfScreen';
import UploadNotesScreen from '@/screens/teacher/UploadNotesScreen';
import AddSubjectScreen from '@/screens/teacher/AddSubjectScreen';
import AddUnitScreen from '@/screens/teacher/AddUnitScreen';
import AddYoutubeScreen from '@/screens/teacher/AddYoutubeScreen';
import TeacherAnnouncementsScreen from '@/screens/teacher/TeacherAnnouncementsScreen';
import ManageMaterialsScreen from '@/screens/teacher/ManageMaterialsScreen';
import ArrearSubjectsScreen from '@/screens/student/ArrearSubjectsScreen';
import AddPdfScreen from '@/screens/teacher/AddPdfScreen';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/login" element={<LoginScreen />} />

        {/* Student routes */}
   <Route
  path="/home"
  element={
    <ProtectedRoute role="student">
      <HomeScreen />
    </ProtectedRoute>
  }
/>
        <Route path="/semester/:semesterId" element={<SemesterScreen />} />
        <Route path="/subjects" element={<SubjectsScreen />} />
        <Route path="/subject/:subjectId" element={<SubjectDetailsScreen />} />
        <Route path="/subject/:subjectId/unit/:unitId" element={<UnitDetailsScreen />} />
        <Route path="/pdf/:pdfId" element={<PdfViewerScreen />} />
        <Route path="/youtube/:videoId" element={<YouTubeScreen />} />
        <Route path="/ai-assistant" element={<AIAssistantScreen />} />
        <Route
  path="/arrear-subjects"
  element={
    <ProtectedRoute>
      <ArrearSubjectsScreen />
    </ProtectedRoute>
  }
/>
      <Route
  path="/bookmarks"
  element={
    <ProtectedRoute>
      <BookmarksScreen />
    </ProtectedRoute>
  }
/>
        <Route path="/notifications" element={<NotificationsScreen />} />
       <Route
  path="/profile"
  element={
    <ProtectedRoute>
      <ProfileScreen />
    </ProtectedRoute>
  }
/>

        {/* Teacher routes */}
   <Route
  path="/teacher/dashboard"
  element={
    <ProtectedRoute role="teacher">
      <TeacherDashboardScreen />
    </ProtectedRoute>
  }
/>
        <Route path="/teacher/upload-pdf" element={<UploadPdfScreen />} />
        <Route path="/teacher/upload-notes" element={<UploadNotesScreen />} />
        <Route path="/teacher/add-subject" element={<AddSubjectScreen />} />
        <Route path="/teacher/add-unit" element={<AddUnitScreen />} />
        <Route path="/teacher/add-youtube" element={<AddYoutubeScreen />} />
        <Route path="/teacher/announcements" element={<TeacherAnnouncementsScreen />} />
        <Route path="/teacher/manage-materials" element={<ManageMaterialsScreen />} />
        <Route
  path="/teacher/add-pdf"
  element={<AddPdfScreen />}
/>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
    </BrowserRouter>
  );
}
