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
  Modal,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import {
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  ChevronDown,
  Check,
  AlertCircle,
  GraduationCap,
  Layers,
  BookOpen,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getAllTeacherPdfs, getPdfViewTracking } from '@/service/tracking';
import { getTeacherCohortProgress } from '@/service/progress';
import { getSubjects } from '@/service/subject';
import type { PdfTrackingStats, TeacherCohortProgress, Subject } from '@/types';

type ScreenMode = 'pdf' | 'progress';
type Tab = 'viewed' | 'notViewed';
type ProgressFilter = 'all' | 'incomplete' | 'completed';

export default function PdfTrackingScreen() {
  const route = useRoute<any>();
  const initialPdfId = route.params?.pdfId || '';

  const [screenMode, setScreenMode] = useState<ScreenMode>('progress'); // Default to Unit Progress or PDF

  // PDF Tracking state
  const [pdfs, setPdfs] = useState<
    { id: string; title: string; subjectName: string; unitTitle: string; createdAt: string }[]
  >([]);
  const [activePdfId, setActivePdfId] = useState<string>(initialPdfId);
  const [trackingStats, setTrackingStats] = useState<PdfTrackingStats | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [tab, setTab] = useState<Tab>('viewed');
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Unit Progress Tracking state
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  const [cohortProgress, setCohortProgress] = useState<TeacherCohortProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load PDFs
  const loadPdfsList = useCallback(async () => {
    setLoadingPdf(true);
    const list = await getAllTeacherPdfs();
    setPdfs(list);

    if (list.length > 0) {
      const selected = initialPdfId && list.some((p) => p.id === initialPdfId) ? initialPdfId : list[0].id;
      setActivePdfId(selected);
    } else {
      setLoadingPdf(false);
    }
  }, [initialPdfId]);

  // Load Subjects for Progress
  const loadSubjectsList = useCallback(async () => {
    setLoadingProgress(true);
    const list = await getSubjects();
    setSubjectsList(list || []);

    if (list && list.length > 0) {
      setActiveSubjectId(list[0].id);
    } else {
      setLoadingProgress(false);
    }
  }, []);

  // Load PDF Stats
  const loadStats = useCallback(async (pdfId: string) => {
    setRefreshing(true);
    const result = await getPdfViewTracking(pdfId);
    setTrackingStats(result.stats);
    setLoadingPdf(false);
    setRefreshing(false);
  }, []);

  // Load Subject Cohort Progress
  const loadCohortStats = useCallback(async (subjectId: string) => {
    if (!subjectId) return;
    setRefreshing(true);
    setLoadingProgress(true);
    const result = await getTeacherCohortProgress(subjectId);
    setCohortProgress(result);
    setLoadingProgress(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadPdfsList();
    loadSubjectsList();
  }, [loadPdfsList, loadSubjectsList]);

  useEffect(() => {
    if (activePdfId && screenMode === 'pdf') {
      loadStats(activePdfId);
    }
  }, [activePdfId, screenMode, loadStats]);

  useEffect(() => {
    if (activeSubjectId && screenMode === 'progress') {
      loadCohortStats(activeSubjectId);
    }
  }, [activeSubjectId, screenMode, loadCohortStats]);

  const onRefresh = () => {
    if (screenMode === 'pdf' && activePdfId) {
      loadStats(activePdfId);
    } else if (screenMode === 'progress' && activeSubjectId) {
      loadCohortStats(activeSubjectId);
    }
  };

  const filteredViewed = (trackingStats?.viewedStudents ?? []).filter((s) =>
    `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNotViewed = (trackingStats?.notViewedStudents ?? []).filter((s) =>
    `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = (cohortProgress?.students ?? []).filter((s) => {
    const matchesSearch = `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (progressFilter === 'completed') return s.percentage === 100;
    if (progressFilter === 'incomplete') return s.percentage < 100;
    return true;
  });

  const activePdf = pdfs.find((p) => p.id === activePdfId);
  const activeSubject = subjectsList.find((s) => s.id === activeSubjectId);

  const formatViewedTime = (isoString?: string) => {
    if (!isoString) return 'Viewed';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Viewed';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#059669';
    if (percentage >= 40) return theme.colors.primary;
    return '#D97706';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Student Analytics"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color={refreshing ? theme.colors.textMuted : theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Top Mode Segment Switch */}
      <View style={styles.modeSegmentContainer}>
        <TouchableOpacity
          style={[styles.modeSegmentBtn, screenMode === 'progress' && styles.modeSegmentBtnActive]}
          onPress={() => setScreenMode('progress')}
          activeOpacity={0.8}
        >
          <GraduationCap size={15} color={screenMode === 'progress' ? '#FFFFFF' : theme.colors.textSecondary} />
          <Text style={[styles.modeSegmentText, screenMode === 'progress' && styles.modeSegmentTextActive]}>
            Unit Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeSegmentBtn, screenMode === 'pdf' && styles.modeSegmentBtnActive]}
          onPress={() => setScreenMode('pdf')}
          activeOpacity={0.8}
        >
          <FileText size={15} color={screenMode === 'pdf' ? '#FFFFFF' : theme.colors.textSecondary} />
          <Text style={[styles.modeSegmentText, screenMode === 'pdf' && styles.modeSegmentTextActive]}>
            PDF Views
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* MODE: UNIT PROGRESS TRACKING                              */}
        {/* ========================================================= */}
        {screenMode === 'progress' && (
          <>
            {/* Subject Selector Dropdown Trigger */}
            <View style={styles.selectorCard}>
              <Text style={styles.selectorLabel}>SELECT SUBJECT</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowSubjectModal(true)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownMainText} numberOfLines={1}>
                    {activeSubject ? activeSubject.name : 'Select a subject'}
                  </Text>
                  <Text style={styles.dropdownSubText}>
                    {activeSubject ? `${activeSubject.code} • Semester ${activeSubject.semester}` : 'No subject selected'}
                  </Text>
                </View>
                <ChevronDown size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingProgress ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading student progress...</Text>
              </View>
            ) : !cohortProgress ? (
              <View style={styles.emptyContainer}>
                <GraduationCap size={44} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>No Cohort Data</Text>
                <Text style={styles.emptySub}>Select a subject above to view student unit progress.</Text>
              </View>
            ) : (
              <>
                {/* Cohort Progress Overview Card */}
                <View style={styles.overviewCard}>
                  <View style={styles.overviewTop}>
                    <View>
                      <Text style={styles.overviewSubjectCode}>{cohortProgress.subjectCode}</Text>
                      <Text style={styles.overviewSubjectName}>{cohortProgress.subjectName}</Text>
                    </View>
                    <View style={styles.avgCircle}>
                      <Text style={styles.avgCircleVal}>{cohortProgress.averagePercentage}%</Text>
                      <Text style={styles.avgCircleLabel}>Class Avg</Text>
                    </View>
                  </View>

                  {/* Class Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statsCol}>
                      <Text style={styles.statsColVal}>{cohortProgress.totalStudents}</Text>
                      <Text style={styles.statsColLabel}>Enrolled Students</Text>
                    </View>
                    <View style={styles.statsDivider} />
                    <View style={styles.statsCol}>
                      <Text style={styles.statsColVal}>{cohortProgress.totalUnits}</Text>
                      <Text style={styles.statsColLabel}>Units in Subject</Text>
                    </View>
                    <View style={styles.statsDivider} />
                    <View style={styles.statsCol}>
                      <Text style={styles.statsColVal}>{cohortProgress.fullyCompletedStudentsCount}</Text>
                      <Text style={styles.statsColLabel}>100% Completed</Text>
                    </View>
                  </View>
                </View>

                {/* Filter Tabs & Search */}
                <View style={styles.filterRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, progressFilter === 'all' && styles.filterChipActive]}
                    onPress={() => setProgressFilter('all')}
                  >
                    <Text style={[styles.filterChipText, progressFilter === 'all' && styles.filterChipTextActive]}>
                      All ({cohortProgress.students.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, progressFilter === 'incomplete' && styles.filterChipActive]}
                    onPress={() => setProgressFilter('incomplete')}
                  >
                    <Text style={[styles.filterChipText, progressFilter === 'incomplete' && styles.filterChipTextActive]}>
                      In Progress ({cohortProgress.students.filter((s) => s.percentage < 100).length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, progressFilter === 'completed' && styles.filterChipActive]}
                    onPress={() => setProgressFilter('completed')}
                  >
                    <Text style={[styles.filterChipText, progressFilter === 'completed' && styles.filterChipTextActive]}>
                      Finished ({cohortProgress.fullyCompletedStudentsCount})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBox}>
                  <Search size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search student or register no..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                {/* Students Progress List */}
                <View style={styles.studentsList}>
                  {filteredStudents.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyTitle}>No Students Found</Text>
                      <Text style={styles.emptySub}>No students match the current filter/search.</Text>
                    </View>
                  ) : (
                    filteredStudents.map((student) => {
                      const isExpanded = expandedStudentId === student.studentId;
                      const barColor = getProgressColor(student.percentage);

                      return (
                        <View key={student.studentId} style={styles.studentCard}>
                          <TouchableOpacity
                            style={styles.studentCardHeader}
                            onPress={() => setExpandedStudentId(isExpanded ? null : student.studentId)}
                            activeOpacity={0.8}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={styles.studentTopRow}>
                                <Text style={styles.studentNameText}>{student.studentName}</Text>
                                <Text style={[styles.studentPercentBadge, { color: barColor }]}>
                                  {student.percentage}%
                                </Text>
                              </View>
                              <Text style={styles.studentRegText}>
                                Reg: {student.registerNumber} • Sem {student.semester}
                              </Text>

                              {/* Progress bar */}
                              <View style={styles.studentBarBg}>
                                <View
                                  style={[
                                    styles.studentBarFill,
                                    {
                                      width: `${Math.min(100, Math.max(0, student.percentage))}%`,
                                      backgroundColor: barColor,
                                    },
                                  ]}
                                />
                              </View>

                              <Text style={styles.studentUnitsCount}>
                                Completed {student.completedUnits} of {student.totalUnits} units
                                {student.remainingUnits > 0 ? ` (${student.remainingUnits} incomplete)` : ' ✓'}
                              </Text>
                            </View>
                            <ChevronDown
                              size={18}
                              color={theme.colors.textMuted}
                              style={{
                                transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                                marginLeft: 8,
                              }}
                            />
                          </TouchableOpacity>

                          {/* Expanded Unit Breakdown */}
                          {isExpanded && (
                            <View style={styles.studentExpandedBox}>
                              <View style={styles.unitsDivider} />

                              {/* Incomplete Units */}
                              {student.incompleteUnits.length > 0 && (
                                <View style={{ marginBottom: 10 }}>
                                  <Text style={styles.incompleteHeaderLabel}>Incomplete Units ({student.incompleteUnits.length}):</Text>
                                  {student.incompleteUnits.map((u) => (
                                    <View key={u.id} style={styles.incompleteUnitRow}>
                                      <View style={styles.incompleteDot} />
                                      <Text style={styles.incompleteUnitText}>
                                        Unit {u.unitNumber}: {u.title}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              {/* Completed Units */}
                              {student.completedUnitsList.length > 0 && (
                                <View>
                                  <Text style={styles.completedHeaderLabel}>Completed Units ({student.completedUnitsList.length}):</Text>
                                  {student.completedUnitsList.map((u) => (
                                    <View key={u.id} style={styles.completedUnitRow}>
                                      <CheckCircle2 size={13} color="#059669" />
                                      <Text style={styles.completedUnitText}>
                                        Unit {u.unitNumber}: {u.title}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* MODE: PDF VIEW TRACKING                                  */}
        {/* ========================================================= */}
        {screenMode === 'pdf' && (
          <>
            {/* PDF Selector Dropdown Trigger */}
            <View style={styles.selectorCard}>
              <Text style={styles.selectorLabel}>SELECT PDF MATERIAL</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowPdfModal(true)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownMainText} numberOfLines={1}>
                    {activePdf ? activePdf.title : 'Select a PDF'}
                  </Text>
                  <Text style={styles.dropdownSubText}>
                    {activePdf ? `${activePdf.subjectName} • ${activePdf.unitTitle}` : 'No PDF selected'}
                  </Text>
                </View>
                <ChevronDown size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingPdf ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading PDF tracking data...</Text>
              </View>
            ) : !trackingStats ? (
              <View style={styles.emptyContainer}>
                <FileText size={44} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>No PDF Selected</Text>
                <Text style={styles.emptySub}>Please select a PDF document from the selector above.</Text>
              </View>
            ) : (
              <>
                {/* Stats Overview Card */}
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewSubjectName}>{trackingStats.pdfTitle}</Text>
                  <Text style={styles.overviewSubjectCode}>
                    {trackingStats.subjectName} • {trackingStats.unitTitle}
                  </Text>

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(100, Math.max(0, trackingStats.viewedPercentage))}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressPercent}>{trackingStats.viewedPercentage}%</Text>
                  </View>

                  {/* 3 Metric Columns */}
                  <View style={styles.statsRow}>
                    <View style={styles.statsCol}>
                      <Text style={styles.statsColVal}>{trackingStats.totalStudents}</Text>
                      <Text style={styles.statsColLabel}>Total Cohort</Text>
                    </View>
                    <View style={styles.statsDivider} />
                    <View style={styles.statsCol}>
                      <Text style={[styles.statsColVal, { color: '#34D399' }]}>
                        {trackingStats.viewedCount}
                      </Text>
                      <Text style={styles.statsColLabel}>Opened</Text>
                    </View>
                    <View style={styles.statsDivider} />
                    <View style={styles.statsCol}>
                      <Text style={[styles.statsColVal, { color: '#F87171' }]}>
                        {trackingStats.notViewedCount}
                      </Text>
                      <Text style={styles.statsColLabel}>Not Opened</Text>
                    </View>
                  </View>
                </View>

                {/* Sub Tabs: Viewed / Not Viewed */}
                <View style={styles.subTabsContainer}>
                  <TouchableOpacity
                    style={[styles.subTab, tab === 'viewed' && styles.subTabActive]}
                    onPress={() => setTab('viewed')}
                    activeOpacity={0.8}
                  >
                    <CheckCircle2
                      size={15}
                      color={tab === 'viewed' ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={[styles.subTabText, tab === 'viewed' && styles.subTabTextActive]}>
                      Viewed ({trackingStats.viewedCount})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subTab, tab === 'notViewed' && styles.subTabActive]}
                    onPress={() => setTab('notViewed')}
                    activeOpacity={0.8}
                  >
                    <Clock
                      size={15}
                      color={tab === 'notViewed' ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={[styles.subTabText, tab === 'notViewed' && styles.subTabTextActive]}>
                      Not Viewed ({trackingStats.notViewedCount})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchBox}>
                  <Search size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by student name or reg no..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                {/* Student List */}
                <View style={styles.studentsList}>
                  {tab === 'viewed' && (
                    filteredViewed.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No students found</Text>
                      </View>
                    ) : (
                      filteredViewed.map((s) => (
                        <View key={s.studentId} style={styles.pdfStudentRow}>
                          <View style={styles.studentAvatar}>
                            <Text style={styles.studentAvatarText}>
                              {s.studentName ? s.studentName.charAt(0).toUpperCase() : 'S'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentNameText}>{s.studentName}</Text>
                            <Text style={styles.studentRegText}>{s.registerNumber}</Text>
                          </View>
                          <View style={styles.viewedTimeBadge}>
                            <Text style={styles.viewedTimeText}>{formatViewedTime(s.viewedAt)}</Text>
                          </View>
                        </View>
                      ))
                    )
                  )}

                  {tab === 'notViewed' && (
                    filteredNotViewed.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>All students have viewed this PDF! 🎉</Text>
                      </View>
                    ) : (
                      filteredNotViewed.map((s) => (
                        <View key={s.studentId} style={styles.pdfStudentRow}>
                          <View style={[styles.studentAvatar, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={[styles.studentAvatarText, { color: '#DC2626' }]}>
                              {s.studentName ? s.studentName.charAt(0).toUpperCase() : 'S'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentNameText}>{s.studentName}</Text>
                            <Text style={styles.studentRegText}>{s.registerNumber}</Text>
                          </View>
                          <View style={styles.notViewedBadge}>
                            <Text style={styles.notViewedBadgeText}>Pending</Text>
                          </View>
                        </View>
                      ))
                    )
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Subject Picker Modal */}
      <Modal visible={showSubjectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectModal(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {subjectsList.map((subj) => (
                <TouchableOpacity
                  key={subj.id}
                  style={[styles.modalItem, subj.id === activeSubjectId && styles.modalItemActive]}
                  onPress={() => {
                    setActiveSubjectId(subj.id);
                    setShowSubjectModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{subj.name}</Text>
                    <Text style={styles.modalItemSub}>{subj.code} • Semester {subj.semester}</Text>
                  </View>
                  {subj.id === activeSubjectId && <Check size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PDF Picker Modal */}
      <Modal visible={showPdfModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select PDF Material</Text>
              <TouchableOpacity onPress={() => setShowPdfModal(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {pdfs.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.modalItem, p.id === activePdfId && styles.modalItemActive]}
                  onPress={() => {
                    setActivePdfId(p.id);
                    setShowPdfModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{p.title}</Text>
                    <Text style={styles.modalItemSub}>{p.subjectName} • {p.unitTitle}</Text>
                  </View>
                  {p.id === activePdfId && <Check size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  refreshBtn: {
    padding: 6,
  },
  modeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    gap: 4,
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeSegmentBtnActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeSegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  modeSegmentTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  selectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dropdownSubText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  overviewCard: {
    backgroundColor: '#1E40AF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  overviewSubjectCode: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  overviewSubjectName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  avgCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avgCircleVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E40AF',
  },
  avgCircleLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 12,
  },
  statsCol: {
    alignItems: 'center',
  },
  statsColVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statsColLabel: {
    fontSize: 10,
    color: '#DBEAFE',
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 4,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  subTabTextActive: {
    color: theme.colors.primary,
  },
  studentsList: {
    gap: 10,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  studentNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  studentPercentBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  studentRegText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  studentBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  studentBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  studentUnitsCount: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  studentExpandedBox: {
    marginTop: 10,
  },
  unitsDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginBottom: 10,
  },
  incompleteHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 6,
  },
  incompleteUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  incompleteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  incompleteUnitText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  completedHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 6,
  },
  completedUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  completedUnitText: {
    fontSize: 11,
    color: '#059669',
  },
  pdfStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 10,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  viewedTimeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewedTimeText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
  },
  notViewedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  notViewedBadgeText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalItemActive: {
    backgroundColor: '#F8FAFC',
  },
  modalItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalItemSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
