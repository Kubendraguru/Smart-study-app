import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  GraduationCap,
  CheckCircle2,
  Circle,
  BookOpen,
  FileText,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  Sparkles,
  ArrowLeft,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getStudentOverallProgress, toggleUnitCompletion } from '@/service/progress';
import type { StudentOverallProgress, SubjectProgressSummary } from '@/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function StudentProgressScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressData, setProgressData] = useState<StudentOverallProgress | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [togglingUnitId, setTogglingUnitId] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      const data = await getStudentOverallProgress();
      setProgressData(data);
      // Automatically expand all subjects by default so units are immediately visible
      if (data.subjects.length > 0) {
        setExpandedSubjects((prev) => {
          if (Object.keys(prev).length === 0) {
            const allExpanded: Record<string, boolean> = {};
            data.subjects.forEach((s) => {
              allExpanded[s.subjectId] = true;
            });
            return allExpanded;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load progress data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProgress();
  };

  const toggleSubjectExpand = (subjectId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  const toggleAllExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const areAllExpanded = progressData?.subjects.every((s) => expandedSubjects[s.subjectId]);
    const newState: Record<string, boolean> = {};
    progressData?.subjects.forEach((s) => {
      newState[s.subjectId] = !areAllExpanded;
    });
    setExpandedSubjects(newState);
  };

  const handleToggleUnit = async (subjectId: string, unitId: string, currentCompleted: boolean) => {
    if (togglingUnitId) return;

    const nextCompleted = !currentCompleted;
    setTogglingUnitId(unitId);

    // Optimistic state update
    setProgressData((prev) => {
      if (!prev) return prev;

      let newAllCompleted = 0;
      let newAllTotal = 0;

      const updatedSubjects = prev.subjects.map((s) => {
        if (s.subjectId !== subjectId) {
          newAllCompleted += s.completedUnits;
          newAllTotal += s.totalUnits;
          return s;
        }

        let subjCompleted = 0;
        const updatedUnits = s.units.map((u) => {
          const isDone = u.id === unitId ? nextCompleted : u.completed;
          if (isDone) subjCompleted += 1;
          return { ...u, completed: isDone };
        });

        const percentage = s.totalUnits > 0 ? Math.round((subjCompleted / s.totalUnits) * 100) : 0;
        newAllCompleted += subjCompleted;
        newAllTotal += s.totalUnits;

        return {
          ...s,
          completedUnits: subjCompleted,
          remainingUnits: Math.max(0, s.totalUnits - subjCompleted),
          percentage,
          units: updatedUnits,
        };
      });

      const overallPercentage = newAllTotal > 0 ? Math.round((newAllCompleted / newAllTotal) * 100) : 0;

      return {
        ...prev,
        completedUnits: newAllCompleted,
        remainingUnits: Math.max(0, newAllTotal - newAllCompleted),
        overallPercentage,
        subjects: updatedSubjects,
      };
    });

    const res = await toggleUnitCompletion(unitId, nextCompleted);
    setTogglingUnitId(null);

    if (!res.success) {
      // Re-fetch on error to sync with backend
      loadProgress();
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#059669'; // Green
    if (percentage >= 40) return theme.colors.primary; // Blue
    return '#D97706'; // Amber
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Learning Progress" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading your academic progress...</Text>
          </View>
        ) : (
          <>
            {/* Main Progress Overview Card */}
            <View style={styles.overviewCard}>
              <View style={styles.overviewTop}>
                <View>
                  <View style={styles.overviewBadge}>
                    <GraduationCap size={14} color="#FFFFFF" />
                    <Text style={styles.overviewBadgeText}>Academic Overview</Text>
                  </View>
                  <Text style={styles.overviewTitle}>Overall Completion</Text>
                </View>
                <View style={styles.percentageCircle}>
                  <Text style={styles.percentageCircleText}>
                    {progressData?.overallPercentage ?? 0}%
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.mainProgressBarBg}>
                <View
                  style={[
                    styles.mainProgressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, progressData?.overallPercentage ?? 0))}%`,
                    },
                  ]}
                />
              </View>

              {/* 4 Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <CheckCircle2 size={16} color="#059669" />
                  </View>
                  <Text style={styles.statVal}>{progressData?.completedUnits ?? 0}</Text>
                  <Text style={styles.statLabel}>Completed Units</Text>
                </View>

                <View style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Layers size={16} color="#D97706" />
                  </View>
                  <Text style={styles.statVal}>{progressData?.remainingUnits ?? 0}</Text>
                  <Text style={styles.statLabel}>Remaining Units</Text>
                </View>

                <View style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                    <BookOpen size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.statVal}>{progressData?.totalSubjects ?? 0}</Text>
                  <Text style={styles.statLabel}>Active Subjects</Text>
                </View>

                <View style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
                    <FileText size={16} color="#7C3AED" />
                  </View>
                  <Text style={styles.statVal}>{progressData?.pdfViewsCount ?? 0}</Text>
                  <Text style={styles.statLabel}>PDFs Opened</Text>
                </View>
              </View>
            </View>

            {/* Subject-Wise Breakdown Section Header */}
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Subject Progress & Unit Checklist</Text>
                <Text style={styles.sectionSubtitle}>
                  Check off completed units to update your progress
                </Text>
              </View>
              {progressData && progressData.subjects.length > 0 && (
                <TouchableOpacity
                  style={styles.expandAllBtn}
                  onPress={toggleAllExpand}
                  activeOpacity={0.7}
                >
                  <Text style={styles.expandAllBtnText}>
                    {progressData.subjects.every((s) => expandedSubjects[s.subjectId])
                      ? 'Collapse All'
                      : 'Expand All'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Subjects List */}
            {(!progressData || progressData.subjects.length === 0) ? (
              <View style={styles.emptyContainer}>
                <BookOpen size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>No Subjects Found</Text>
                <Text style={styles.emptySub}>
                  No active semester or arrear subjects are currently enrolled.
                </Text>
              </View>
            ) : (
              progressData.subjects.map((subj) => {
                const isExpanded = Boolean(expandedSubjects[subj.subjectId]);
                const progressColor = getProgressColor(subj.percentage);

                return (
                  <View key={subj.subjectId} style={styles.subjectCard}>
                    {/* Subject Header (Collapsible trigger) */}
                    <TouchableOpacity
                      style={styles.subjectHeader}
                      onPress={() => toggleSubjectExpand(subj.subjectId)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.subjectTagRow}>
                          <View
                            style={[
                              styles.semBadge,
                              subj.isArrear && styles.arrearBadge,
                            ]}
                          >
                            <Text
                              style={[
                                styles.semBadgeText,
                                subj.isArrear && styles.arrearBadgeText,
                              ]}
                            >
                              {subj.isArrear ? 'Arrear Subject' : `Semester ${subj.semester}`}
                            </Text>
                          </View>
                          <Text style={styles.subjectCode}>{subj.subjectCode}</Text>
                        </View>

                        <Text style={styles.subjectName}>{subj.subjectName}</Text>

                        {/* Subject Progress Bar and Counts */}
                        <View style={styles.subjectProgressRow}>
                          <View style={styles.subjectBarBg}>
                            <View
                              style={[
                                styles.subjectBarFill,
                                {
                                  width: `${Math.min(100, Math.max(0, subj.percentage))}%`,
                                  backgroundColor: progressColor,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.subjectPercentText, { color: progressColor }]}>
                            {subj.percentage}%
                          </Text>
                        </View>

                        <Text style={styles.unitsCountSummary}>
                          Completed {subj.completedUnits} of {subj.totalUnits} units ({subj.remainingUnits} remaining)
                        </Text>
                      </View>

                      <View style={styles.expandIconBox}>
                        {isExpanded ? (
                          <ChevronUp size={20} color={theme.colors.textMuted} />
                        ) : (
                          <ChevronDown size={20} color={theme.colors.textMuted} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Unit Checklist (Expanded view) */}
                    {isExpanded && (
                      <View style={styles.unitsContainer}>
                        <View style={styles.unitsDivider} />
                        <Text style={styles.unitsHeaderLabel}>Unit Learning Checklist</Text>

                        {subj.units.length === 0 ? (
                          <Text style={styles.noUnitsText}>No units added for this subject yet.</Text>
                        ) : (
                          subj.units.map((unit) => {
                            const isDone = unit.completed;
                            const isToggling = togglingUnitId === unit.id;

                            return (
                              <TouchableOpacity
                                key={unit.id}
                                style={[
                                  styles.unitRow,
                                  isDone && styles.unitRowDone,
                                ]}
                                onPress={() => handleToggleUnit(subj.subjectId, unit.id, isDone)}
                                disabled={isToggling}
                                activeOpacity={0.7}
                              >
                                <View style={styles.checkboxWrapper}>
                                  {isToggling ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                  ) : isDone ? (
                                    <CheckCircle2 size={20} color="#059669" />
                                  ) : (
                                    <Circle size={20} color={theme.colors.textMuted} />
                                  )}
                                </View>

                                <View style={styles.unitDetails}>
                                  <Text style={[styles.unitNumberBadge, isDone && styles.unitNumberBadgeDone]}>
                                    Unit {unit.unitNumber}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.unitTitle,
                                      isDone && styles.unitTitleDone,
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {unit.title}
                                  </Text>
                                </View>

                                <TouchableOpacity
                                  style={styles.openUnitBtn}
                                  onPress={() =>
                                    navigation.navigate('UnitDetails', {
                                      unitId: unit.id,
                                      unitTitle: unit.title,
                                      unitNumber: unit.unitNumber,
                                      subjectId: subj.subjectId,
                                      subjectName: subj.subjectName,
                                    })
                                  }
                                >
                                  <Text style={styles.openUnitBtnText}>Open</Text>
                                </TouchableOpacity>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  overviewCard: {
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  overviewBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  percentageCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  percentageCircleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E40AF',
  },
  mainProgressBarBg: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 18,
  },
  mainProgressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  expandAllBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  expandAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subjectTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  semBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  arrearBadge: {
    backgroundColor: '#FEF3C7',
  },
  semBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  arrearBadgeText: {
    color: '#D97706',
  },
  subjectCode: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subjectProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  subjectBarBg: {
    flex: 1,
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  subjectBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  unitsCountSummary: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  expandIconBox: {
    padding: 8,
    marginLeft: 8,
  },
  unitsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  unitsDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginBottom: 12,
  },
  unitsHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noUnitsText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitRowDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  checkboxWrapper: {
    marginRight: 10,
  },
  unitDetails: {
    flex: 1,
    marginRight: 8,
  },
  unitNumberBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  unitNumberBadgeDone: {
    color: '#059669',
  },
  unitTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 18,
  },
  unitTitleDone: {
    color: '#15803D',
  },
  openUnitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  openUnitBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
});
