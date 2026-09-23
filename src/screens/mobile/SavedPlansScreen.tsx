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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Layers,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  ChevronRight,
  RotateCcw,
  BookOpen,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import type { StudyPlan, StudyTask } from '@/types';
import {
  getSavedStudyPlans,
  getStudyPlanDetails,
  deleteStudyPlan,
  updateStudyTask,
} from '@/service/studyPlanner';

export default function SavedPlansScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const data = await getSavedStudyPlans(user.id);
      setPlans(data);
    } catch (err) {
      console.error('Error loading saved study plans:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlans();
  };

  const handleOpenPlan = async (plan: StudyPlan) => {
    setLoadingDetails(true);
    try {
      const full = await getStudyPlanDetails(plan.id);
      setSelectedPlan(full);
    } catch (err) {
      console.error('Error opening plan:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleTask = async (task: StudyTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const res = await updateStudyTask(task.id, { status: newStatus });
    if (res.success && selectedPlan) {
      // Refresh selected plan view
      const full = await getStudyPlanDetails(selectedPlan.id);
      setSelectedPlan(full);
      loadPlans();
    }
  };

  const handleDeletePlan = (plan: StudyPlan) => {
    Alert.alert('Delete Plan', `Are you sure you want to delete "${plan.title}" and all its scheduled sessions?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteStudyPlan(plan.id);
          if (res.success) {
            setSelectedPlan(null);
            loadPlans();
          } else {
            Alert.alert('Error', res.error || 'Failed to delete plan');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader
        title={selectedPlan ? 'Plan Details' : 'My Saved Study Plans'}
        showBack
        onBack={() => {
          if (selectedPlan) {
            setSelectedPlan(null);
          } else {
            navigation.goBack();
          }
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {selectedPlan ? (
          /* Plan Detailed View */
          <>
            <View style={styles.planHero}>
              <View style={styles.planHeroHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planHeroTitle}>{selectedPlan.title}</Text>
                  {selectedPlan.description && (
                    <Text style={styles.planHeroDesc}>{selectedPlan.description}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.deletePlanBtn}
                  onPress={() => handleDeletePlan(selectedPlan)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>

              {/* Progress */}
              <View style={styles.progressBox}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>
                    {selectedPlan.completed_tasks_count || 0} of{' '}
                    {selectedPlan.total_tasks_count || 0} Sessions Completed
                  </Text>
                  <Text style={styles.progressPercent}>
                    {selectedPlan.total_tasks_count
                      ? Math.round(
                          ((selectedPlan.completed_tasks_count || 0) /
                            selectedPlan.total_tasks_count) *
                            100
                        )
                      : 0}
                    %
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${
                          selectedPlan.total_tasks_count
                            ? Math.round(
                                ((selectedPlan.completed_tasks_count || 0) /
                                  selectedPlan.total_tasks_count) *
                                  100
                              )
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* AI Strategy Summary */}
              {selectedPlan.ai_summary && (
                <View style={styles.summaryBox}>
                  <Sparkles size={14} color={theme.colors.primary} style={{ marginTop: 2 }} />
                  <Text style={styles.summaryText}>{selectedPlan.ai_summary}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.heroActionRow}>
                <TouchableOpacity
                  style={styles.reorganizeBtn}
                  onPress={() => navigation.navigate('AIStudyPlanGenerator')}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={14} color={theme.colors.primary} />
                  <Text style={styles.reorganizeBtnText}>Reorganize / Generate New</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sessions List */}
            <Text style={styles.sectionTitle}>Scheduled Study Sessions</Text>

            {selectedPlan.tasks && selectedPlan.tasks.length > 0 ? (
              selectedPlan.tasks.map((task) => {
                const isDone = task.status === 'completed';

                return (
                  <View key={task.id} style={[styles.taskItem, isDone && styles.taskItemDone]}>
                    <TouchableOpacity
                      style={styles.checkTouch}
                      onPress={() => handleToggleTask(task)}
                      activeOpacity={0.7}
                    >
                      {isDone ? (
                        <CheckCircle2 size={22} color={theme.colors.success} />
                      ) : (
                        <Circle size={22} color={theme.colors.textMuted} />
                      )}
                    </TouchableOpacity>

                    <View style={styles.taskInfo}>
                      <View style={styles.taskBadges}>
                        {task.subject && (
                          <View style={styles.subjBadge}>
                            <Text style={styles.subjBadgeText}>{task.subject.subject_code}</Text>
                          </View>
                        )}
                        <View style={styles.dateBadge}>
                          <Calendar size={10} color={theme.colors.textMuted} />
                          <Text style={styles.dateBadgeText}>{task.study_date}</Text>
                        </View>
                        <View style={styles.timeBadge}>
                          <Clock size={10} color={theme.colors.textMuted} />
                          <Text style={styles.timeBadgeText}>
                            {task.start_time.substring(0, 5)} - {task.end_time.substring(0, 5)}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                        {task.title}
                      </Text>

                      {task.description && (
                        <Text style={styles.taskDesc} numberOfLines={2}>
                          {task.description}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noTasksText}>No tasks found in this plan.</Text>
            )}
          </>
        ) : (
          /* Plans List View */
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved Timetables</Text>
              <Text style={styles.sectionCount}>{plans.length} Saved</Text>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading saved plans...</Text>
              </View>
            ) : plans.length === 0 ? (
              <View style={styles.emptyCard}>
                <Layers size={36} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>No Saved Study Plans</Text>
                <Text style={styles.emptySub}>
                  Use the AI Study Plan Generator to create and save personalized study timetables.
                </Text>
                <TouchableOpacity
                  style={styles.createFirstBtn}
                  onPress={() => navigation.navigate('AIStudyPlanGenerator')}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text style={styles.createFirstBtnText}>Generate My Study Plan</Text>
                </TouchableOpacity>
              </View>
            ) : (
              plans.map((plan) => {
                const total = plan.total_tasks_count || 0;
                const completed = plan.completed_tasks_count || 0;
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.planCard}
                    onPress={() => handleOpenPlan(plan)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.planCardLeft}>
                      <View style={styles.planIconBox}>
                        <Layers size={22} color={theme.colors.primary} />
                      </View>

                      <View style={styles.planCardInfo}>
                        <Text style={styles.planCardTitle}>{plan.title}</Text>
                        <Text style={styles.planCardSub}>
                          {completed} / {total} sessions completed · {plan.available_hours_per_day}h daily
                        </Text>

                        {/* Mini progress bar */}
                        <View style={styles.miniProgressBg}>
                          <View style={[styles.miniProgressFill, { width: `${percent}%` }]} />
                        </View>
                      </View>
                    </View>

                    <ChevronRight size={20} color={theme.colors.border} />
                  </TouchableOpacity>
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
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 10,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    marginTop: 16,
  },
  createFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  planCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  planIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planCardInfo: {
    flex: 1,
  },
  planCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  planCardSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  miniProgressBg: {
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  planHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  planHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  planHeroDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  deletePlanBtn: {
    padding: 6,
  },
  progressBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  summaryText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    flex: 1,
    lineHeight: 15,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reorganizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  reorganizeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  taskItemDone: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  checkTouch: {
    marginRight: 10,
    marginTop: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  subjBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateBadgeText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeBadgeText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  taskDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  noTasksText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
});
