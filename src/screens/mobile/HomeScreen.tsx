import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  Bell,
  GraduationCap,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Sparkles,
  Award,
  Calendar,
  Droplets,
  CheckCircle2,
  ClipboardList,
import { theme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Subject, Exam, StudentOverallProgress } from '@/types';
import { getDailyStudyProgress } from '@/service/studyPlanner';
import { getStudentUpcomingExams } from '@/service/exam';
import { getTodayHydration, logWaterIntake } from '@/service/hydration';
import { getStudentOverallProgress } from '@/service/progress';

type SupabaseSubject = {
  id: string;
  subject_code: string;
  subject_name: string;
  semester: number;
  department: string;
  credits: number;
  description: string | null;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [search, setSearch] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentName, setStudentName] = useState('Student');
  const [plannerProgress, setPlannerProgress] = useState<{ total: number; completed: number; percentage: number }>({ total: 0, completed: 0, percentage: 0 });
  const [nextExam, setNextExam] = useState<Exam | null>(null);
  const [waterMl, setWaterMl] = useState(0);
  const [overallProgress, setOverallProgress] = useState<StudentOverallProgress | null>(null);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const [profileRes, progData, examsData, hydrationData, studentProg] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        getDailyStudyProgress(user.id),
        getStudentUpcomingExams(user.id),
        getTodayHydration(user.id),
        getStudentOverallProgress(user.id),
      ]);

      if (profileRes.data?.full_name) {
        setStudentName(profileRes.data.full_name);
      }
      setPlannerProgress({
        total: progData.total,
        completed: progData.completed,
        percentage: progData.percentage,
      });
      if (examsData && examsData.length > 0) {
        setNextExam(examsData[0]);
      } else {
        setNextExam(null);
      }
      setWaterMl(hydrationData.totalMl);
      setOverallProgress(studentProg);
    } catch {
      // Ignored
    }
  }, [user]);

  const loadSubjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get semester 5 subjects
      const { data: currentSubjects, error: currentError } = await supabase
        .from('subjects')
        .select('*')
        .eq('semester', 5)
        .order('subject_name', { ascending: true });

      if (currentError) {
        console.error('Error loading current subjects:', currentError);
      }

      // 2. Get student's arrear subjects
      const { data: studentArrears, error: arrearError } = await supabase
        .from('student_subjects')
        .select(`
          subject_id,
          type,
          subjects (
            id,
            subject_code,
            subject_name,
            semester,
            department,
            credits,
            description
          )
        `)
        .eq('student_id', user.id)
        .eq('type', 'arrear');

      if (arrearError) {
        console.error('Error loading arrears:', arrearError);
      }

      const arrearSubjects = (studentArrears ?? [])
        .map((item: any) => item.subjects)
        .filter((subject: any) => subject && subject.semester < 5);

      const uniqueArrears = Array.from(
        new Map(arrearSubjects.map((subject: any) => [subject.id, subject])).values()
      );

      const formattedCurrent: Subject[] = (currentSubjects ?? []).map(
        (subject: SupabaseSubject) => ({
          id: subject.id,
          code: subject.subject_code,
          name: subject.subject_name,
          semester: subject.semester,
          credits: subject.credits,
          description: subject.description ?? '',
          color: 'blue',
          icon: 'book-open',
          progress: 0,
          units: [],
          isArrear: false,
        })
      );

      const formattedArrears: Subject[] = uniqueArrears.map((subject: any) => ({
        id: subject.id,
        code: subject.subject_code,
        name: subject.subject_name,
        semester: subject.semester,
        credits: subject.credits,
        description: subject.description ?? '',
        color: 'red',
        icon: 'book-open',
        progress: 0,
        units: [],
        isArrear: true,
      }));

      setSubjects([...formattedCurrent, ...formattedArrears]);
    } catch (err) {
      console.error('Error in loadSubjects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
    loadSubjects();
  }, [loadUserData, loadSubjects]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSubjects();
  };

  const filteredSubjects = subjects.filter((s) =>
    `${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const currentSubjects = filteredSubjects.filter(
    (subject) => !subject.isArrear && subject.semester === 5
  );

  const arrearSubjects = filteredSubjects.filter(
    (subject) => subject.isArrear && subject.semester < 5
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>
          <View>
            <Text style={styles.welcomeSub}>Welcome back,</Text>
            <Text style={styles.welcomeName} numberOfLines={1}>
              {studentName}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Ask AI Shortcut */}
          <TouchableOpacity
            style={styles.aiHeaderBtn}
            onPress={() => navigation.navigate('AIAssistant')}
            activeOpacity={0.7}
          >
            <Sparkles size={16} color={theme.colors.primary} />
            <Text style={styles.aiHeaderBtnText}>AI</Text>
          </TouchableOpacity>

          {/* Notifications Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Bell size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects, codes, topics..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Next Exam Alert Banner if available */}
        {nextExam && (
          <TouchableOpacity
            style={styles.examAlertBanner}
            onPress={() => navigation.navigate('Exams')}
            activeOpacity={0.85}
          >
            <View style={styles.examAlertLeft}>
              <View style={styles.examAlertIconBox}>
                <GraduationCap size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.examAlertTag}>UPCOMING EXAM ALERT</Text>
                <Text style={styles.examAlertTitle} numberOfLines={1}>
                  {nextExam.subject?.subject_code}: {nextExam.exam_title}
                </Text>
                <Text style={styles.examAlertDate}>
                  {nextExam.formatted_date || nextExam.exam_date}
                </Text>
              </View>
            </View>
            <View style={styles.examCountdownBadge}>
              <Text style={styles.examCountdownDays}>
                {nextExam.days_remaining === 0
                  ? 'TODAY'
                  : nextExam.days_remaining === 1
                  ? 'TOMORROW'
                  : `${nextExam.days_remaining}d left`}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Hub Row: Planner, Assignments & Hydration */}
        <View style={styles.quickHubRow}>
          {/* Study Planner Card */}
          <TouchableOpacity
            style={styles.quickHubCard}
            onPress={() => navigation.navigate('Planner')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickHubIconBox, { backgroundColor: theme.colors.primaryLight }]}>
              <Calendar size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.quickHubTitle}>Planner</Text>
            <Text style={styles.quickHubSub}>
              {plannerProgress.total > 0
                ? `${plannerProgress.completed}/${plannerProgress.total} Done`
                : 'Daily Tasks'}
            </Text>
          </TouchableOpacity>

          {/* Assignments Card */}
          <TouchableOpacity
            style={styles.quickHubCard}
            onPress={() => navigation.navigate('StudentAssignments')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickHubIconBox, { backgroundColor: '#ECFDF5' }]}>
              <ClipboardList size={18} color="#059669" />
            </View>
            <Text style={styles.quickHubTitle}>Assignments</Text>
            <Text style={styles.quickHubSub}>View Due Tasks</Text>
          </TouchableOpacity>

          {/* Hydration Tracker Card */}
          <TouchableOpacity
            style={styles.quickHubCard}
            onPress={() => navigation.navigate('Hydration')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickHubIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Droplets size={18} color="#0284C7" />
            </View>
            <Text style={styles.quickHubTitle}>Hydration</Text>
            <Text style={styles.quickHubSub}>
              {waterMl > 0 ? `${waterMl}ml` : 'Stay Hydrated'}
            </Text>
          </TouchableOpacity>
        </View>


        {/* Progress Card */}
        <TouchableOpacity
          style={styles.progressCard}
          onPress={() => navigation.navigate('StudentProgress')}
          activeOpacity={0.9}
        >
          <View style={styles.progressHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <GraduationCap size={18} color="#FFFFFF" />
              <Text style={styles.progressSemester}>Academic Progress</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11, color: '#DBEAFE', fontWeight: '700' }}>View Details</Text>
              <ChevronRight size={14} color="#DBEAFE" />
            </View>
          </View>
          <Text style={styles.progressTitle}>Your Learning Overview</Text>

          <View style={styles.progressStats}>
            <View>
              <Text style={styles.progressVal}>{overallProgress?.overallPercentage ?? 0}%</Text>
              <Text style={styles.progressLabel}>Overall completion</Text>
            </View>
            <View style={styles.progressDivider} />
            <View>
              <Text style={styles.progressVal}>
                {overallProgress?.completedUnits ?? 0} / {overallProgress?.totalUnits ?? 0}
              </Text>
              <Text style={styles.progressLabel}>Completed Units</Text>
            </View>
            <View style={styles.progressDivider} />
            <View>
              <Text style={styles.progressVal}>
                {loading ? '...' : (overallProgress?.totalSubjects || subjects.length)}
              </Text>
              <Text style={styles.progressLabel}>Enrolled Subjects</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* AI Assistant Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => navigation.navigate('AIAssistant')}
          activeOpacity={0.85}
        >
          <View style={styles.aiBannerIcon}>
            <Sparkles size={22} color="#FFFFFF" />
          </View>
          <View style={styles.aiBannerContent}>
            <Text style={styles.aiBannerTitle}>AI Study Assistant</Text>
            <Text style={styles.aiBannerSubtitle}>
              Ask questions & get simple explanations on your PDFs!
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Current Semester Subjects */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Subjects</Text>
          <Text style={styles.sectionBadge}>{currentSubjects.length} subjects</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading subjects...</Text>
          </View>
        ) : (
          <>
            {currentSubjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                style={styles.subjectCard}
                onPress={() =>
                  navigation.navigate('SubjectDetails', {
                    subjectId: subject.id,
                    subjectName: subject.name,
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.subjectIconBox}>
                  <BookOpen size={20} color={theme.colors.primary} />
                </View>

                <View style={styles.subjectInfo}>
                  <View style={styles.subjectCodeBadge}>
                    <Text style={styles.subjectCodeText}>{subject.code}</Text>
                  </View>
                  <Text style={styles.subjectName} numberOfLines={2}>
                    {subject.name}
                  </Text>
                  <Text style={styles.subjectCredits}>{subject.credits} Credits</Text>
                </View>

                <ChevronRight size={20} color={theme.colors.border} />
              </TouchableOpacity>
            ))}

            {/* Dedicated My Arrear Subjects Section */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>
                  My Arrear Subjects
                </Text>
                {arrearSubjects.length > 0 && (
                  <View style={styles.arrearCountBadge}>
                    <Text style={styles.arrearCountText}>{arrearSubjects.length}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('ArrearSubjects')}
                activeOpacity={0.7}
                style={styles.manageArrearsBtn}
              >
                <Text style={styles.manageArrearsBtnText}>
                  {arrearSubjects.length > 0 ? 'Manage' : '+ Add Arrears'}
                </Text>
              </TouchableOpacity>
            </View>

            {arrearSubjects.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyArrearsCard}
                onPress={() => navigation.navigate('ArrearSubjects')}
                activeOpacity={0.8}
              >
                <View style={styles.emptyArrearsIcon}>
                  <GraduationCap size={20} color={theme.colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyArrearsTitle}>Need to clear backlogs?</Text>
                  <Text style={styles.emptyArrearsSub}>
                    Browse and select previous semester subjects to access notes & videos.
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            ) : (
              arrearSubjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[styles.subjectCard, styles.arrearCard]}
                  onPress={() =>
                    navigation.navigate('SubjectDetails', {
                      subjectId: subject.id,
                      subjectName: subject.name,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={[styles.subjectIconBox, { backgroundColor: theme.colors.dangerBg }]}>
                    <BookOpen size={20} color={theme.colors.danger} />
                  </View>

                  <View style={styles.subjectInfo}>
                    <View style={[styles.subjectCodeBadge, { backgroundColor: theme.colors.dangerBg }]}>
                      <Text style={[styles.subjectCodeText, { color: theme.colors.danger }]}>
                        {subject.code} · Sem {subject.semester}
                      </Text>
                    </View>
                    <Text style={styles.subjectName} numberOfLines={2}>
                      {subject.name}
                    </Text>
                    <Text style={styles.subjectCredits}>{subject.credits} Credits</Text>
                  </View>

                  <ChevronRight size={20} color={theme.colors.border} />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  welcomeSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  welcomeName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  aiHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  progressCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  progressSemester: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressVal: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  progressLabel: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    marginTop: 2,
  },
  progressDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 24,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  aiBannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiBannerContent: {
    flex: 1,
    marginRight: 8,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  aiBannerSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  arrearCard: {
    borderColor: '#FECACA',
  },
  subjectIconBox: {
    width: 44,
    height: 44,
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
  subjectCodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  subjectCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 18,
  },
  subjectCredits: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  examAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  examAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  examAlertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  examAlertTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  examAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  examAlertDate: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  examCountdownBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  examCountdownDays: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickHubRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickHubCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickHubIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickHubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  quickHubSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  arrearCountBadge: {
    backgroundColor: theme.colors.dangerBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  arrearCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.danger,
  },
  manageArrearsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  manageArrearsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  emptyArrearsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyArrearsIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyArrearsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  emptyArrearsSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
  },
});
