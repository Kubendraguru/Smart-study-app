import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  FileText,
  BookOpen,
  Eye,
  LogOut,
  ChevronRight,
  Plus,
  Layers,
  GraduationCap,
  Bell,
  Video,
  ListVideo,
  ClipboardList,
  Book as BookIcon,
  Settings,
} from 'lucide-react-native';
import { theme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/service/auth';
import { supabase } from '@/lib/supabase';

export default function TeacherDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [teacherName, setTeacherName] = useState('Faculty Member');
  const [designation, setDesignation] = useState('Faculty Member');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get profile name & designation
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, designation')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setTeacherName(profile.full_name);
      }
      if (profile?.designation) {
        setDesignation(profile.designation);
      }

      // 2. Get subjects
      const { data: subjs } = await supabase
        .from('subjects')
        .select('*')
        .order('semester', { ascending: true })
        .order('subject_name', { ascending: true });

      setSubjects(subjs ?? []);
    } catch (err) {
      console.error('Error loading teacher dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Teacher Portal</Text>
          <Text style={styles.headerTitle}>{teacherName}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('TeacherSettings')}
            activeOpacity={0.7}
          >
            <Settings size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={18} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeSub}>{designation}</Text>
          <Text style={styles.welcomeName}>{teacherName}</Text>
          <Text style={styles.welcomeDesc}>
            Manage subjects, upload study materials, schedule tests, curate video lectures, and track student progress.
          </Text>
        </View>

        {/* Quick Actions Header */}
        <Text style={styles.sectionTitle}>Curriculum Management</Text>

        {/* Row 1: Add Subject, Add Unit, Upload PDF */}
        <View style={styles.actionsGrid}>
          {/* Add Subject */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddSubject')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Plus size={22} color="#059669" />
            </View>
            <Text style={styles.actionTitle}>Add Subject</Text>
            <Text style={styles.actionSub}>Create course</Text>
          </TouchableOpacity>

          {/* Add Unit */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddUnit')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Layers size={22} color="#D97706" />
            </View>
            <Text style={styles.actionTitle}>Add Unit</Text>
            <Text style={styles.actionSub}>Syllabus unit</Text>
          </TouchableOpacity>

          {/* Upload PDF */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('UploadPdf')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: theme.colors.dangerBg }]}>
              <FileText size={22} color={theme.colors.danger} />
            </View>
            <Text style={styles.actionTitle}>Upload PDF</Text>
            <Text style={styles.actionSub}>Notes & PPTs</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Add Video/Playlist, Assignments, Books */}
        <View style={[styles.actionsGrid, { marginTop: -6 }]}>
          {/* Add Video / Playlist */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddYoutube')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Video size={22} color="#DC2626" />
            </View>
            <Text style={styles.actionTitle}>YouTube Link</Text>
            <Text style={styles.actionSub}>Video & playlist</Text>
          </TouchableOpacity>

          {/* Assignments */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TeacherAssignments')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
              <ClipboardList size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Assignments</Text>
            <Text style={styles.actionSub}>Set homework</Text>
          </TouchableOpacity>

          {/* Books */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TeacherBooks')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#F3E8FF' }]}>
              <BookIcon size={22} color="#9333EA" />
            </View>
            <Text style={styles.actionTitle}>Books</Text>
            <Text style={styles.actionSub}>Textbooks & refs</Text>
          </TouchableOpacity>
        </View>

        {/* Row 3: Exams, Notices, Tracking */}
        <View style={[styles.actionsGrid, { marginTop: -6, marginBottom: 24 }]}>
          {/* Exams */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TeacherExams')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
              <GraduationCap size={22} color="#D97706" />
            </View>
            <Text style={styles.actionTitle}>Exams</Text>
            <Text style={styles.actionSub}>Internal tests</Text>
          </TouchableOpacity>

          {/* Announcements */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TeacherAnnouncements')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Bell size={22} color="#16A34A" />
            </View>
            <Text style={styles.actionTitle}>Notices</Text>
            <Text style={styles.actionSub}>Broadcast alerts</Text>
          </TouchableOpacity>

          {/* Tracking */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('PdfTracking')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: theme.colors.primaryLight }]}>
              <Eye size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Tracking</Text>
            <Text style={styles.actionSub}>Student views</Text>
          </TouchableOpacity>
        </View>

        {/* Subjects List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Curriculum Subjects</Text>
          <Text style={styles.sectionCount}>{subjects.length} Total</Text>
        </View>

        {subjects.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.subjectItem}
            onPress={() =>
              navigation.navigate('SubjectDetails', {
                subjectId: s.id,
                subjectName: s.subject_name,
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.subjectIconBox}>
              <BookOpen size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.subjectInfo}>
              <Text style={styles.subjectCode}>{s.subject_code}</Text>
              <Text style={styles.subjectName} numberOfLines={1}>
                {s.subject_name}
              </Text>
              <Text style={styles.subjectMeta}>
                Semester {s.semester} · {s.department} · {s.credits} Credits
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.border} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeSub: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  welcomeDesc: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 1,
  },
  actionSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  subjectIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subjectInfo: {
    flex: 1,
    marginRight: 8,
  },
  subjectCode: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subjectMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
