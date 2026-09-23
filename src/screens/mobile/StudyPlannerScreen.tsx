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
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  Trash2,
  Edit3,
  Sparkles,
  BookOpen,
  Bell,
  ChevronRight,
  Bookmark,
  Layers,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { StudyTask, TaskPriority, TaskStatus } from '@/types';
import {
  getDayTasks,
  getUpcomingTasks,
  getCompletedTasks,
  getDailyStudyProgress,
  createStudyTask,
  updateStudyTask,
  deleteStudyTask,
  getLocalDateString,
} from '@/service/studyPlanner';

export default function StudyPlannerScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });

  // Add/Edit Task Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(getLocalDateString());
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formReminderMin, setFormReminderMin] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  // Available subjects for dropdown
  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string; code: string }[]>([]);

  const loadSubjects = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('subjects')
        .select('id, subject_name, subject_code')
        .order('subject_name');

      if (data) {
        setSubjectsList(
          data.map((s) => ({
            id: s.id,
            name: s.subject_name,
            code: s.subject_code,
          }))
        );
      }
    } catch {
      // Ignored
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (activeTab === 'today') {
        const todayTasks = await getDayTasks(user.id);
        setTasks(todayTasks);
      } else if (activeTab === 'upcoming') {
        const upTasks = await getUpcomingTasks(user.id);
        setTasks(upTasks);
      } else {
        const compTasks = await getCompletedTasks(user.id);
        setTasks(compTasks);
      }

      const prog = await getDailyStudyProgress(user.id);
      setProgress({
        total: prog.total,
        completed: prog.completed,
        percentage: prog.percentage,
      });
    } catch (err) {
      console.error('Error loading study tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, activeTab]);

  useEffect(() => {
    loadSubjects();
    loadData();
  }, [loadSubjects, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(getLocalDateString());
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormPriority('medium');
    setFormSubjectId(subjectsList[0]?.id || '');
    setFormReminderMin(10);
    setModalVisible(true);
  };

  const openEditModal = (task: StudyTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormDate(task.study_date);
    setFormStartTime(task.start_time ? task.start_time.substring(0, 5) : '09:00');
    setFormEndTime(task.end_time ? task.end_time.substring(0, 5) : '10:00');
    setFormPriority(task.priority);
    setFormSubjectId(task.subject_id || '');
    setFormReminderMin(task.reminder_minutes_before || 10);
    setModalVisible(true);
  };

  const handleSaveTask = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Required Field', 'Please enter a task title.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      if (editingTask) {
        // Update
        const res = await updateStudyTask(editingTask.id, {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          study_date: formDate,
          start_time: formStartTime,
          end_time: formEndTime,
          priority: formPriority,
          subject_id: formSubjectId || null,
          reminder_minutes_before: formReminderMin,
        });

        if (!res.success) {
          Alert.alert('Error', res.error || 'Failed to update task.');
          return;
        }
      } else {
        // Create
        const res = await createStudyTask({
          student_id: user.id,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          study_date: formDate,
          start_time: formStartTime,
          end_time: formEndTime,
          priority: formPriority,
          subject_id: formSubjectId || null,
          reminder_enabled: true,
          reminder_minutes_before: formReminderMin,
        });

        if (!res.success) {
          Alert.alert('Error', res.error || 'Failed to create task.');
          return;
        }
      }

      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskStatus = async (task: StudyTask) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    const res = await updateStudyTask(task.id, { status: newStatus });
    if (res.success) {
      loadData();
    }
  };

  const handleDeleteTask = (task: StudyTask) => {
    Alert.alert('Delete Task', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteStudyTask(task.id, task.notification_id);
          if (res.success) {
            loadData();
          } else {
            Alert.alert('Error', res.error || 'Failed to delete task.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader title="Study Planner" showBack={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top AI Generator Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => navigation.navigate('AIStudyPlanGenerator')}
          activeOpacity={0.85}
        >
          <View style={styles.aiIconBox}>
            <Sparkles size={22} color="#FFFFFF" />
          </View>
          <View style={styles.aiBannerText}>
            <Text style={styles.aiBannerTitle}>Generate My Study Plan</Text>
            <Text style={styles.aiBannerSub}>
              AI organizes your daily sessions based on exam dates & syllabus!
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Progress & Saved Plans Header */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statsSubtitle}>Today's Target</Text>
              <Text style={styles.statsTitle}>
                {progress.completed} of {progress.total} Completed
              </Text>
            </View>
            <TouchableOpacity
              style={styles.savedPlansBtn}
              onPress={() => navigation.navigate('SavedPlans')}
              activeOpacity={0.7}
            >
              <Layers size={14} color={theme.colors.primary} />
              <Text style={styles.savedPlansBtnText}>My Plans</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
          </View>
          <Text style={styles.progressPercentText}>{progress.percentage}% completed today</Text>
        </View>

        {/* Tabs: Today / Upcoming / Completed */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'today' && styles.tabBtnActive]}
            onPress={() => setActiveTab('today')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
              Today's Schedule
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
            onPress={() => setActiveTab('upcoming')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Upcoming
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
              Done ({progress.completed})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Task List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {activeTab === 'today'
              ? 'Today’s Tasks'
              : activeTab === 'upcoming'
              ? 'Upcoming Tasks'
              : 'Completed Study Tasks'}
          </Text>
          <TouchableOpacity style={styles.addTaskBtn} onPress={openCreateModal} activeOpacity={0.8}>
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addTaskBtnText}>Add Task</Text>
          </TouchableOpacity>
        </View>

        {/* Tasks List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading study schedule...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpen size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'today'
                ? 'No tasks scheduled for today'
                : activeTab === 'upcoming'
                ? 'No upcoming tasks'
                : 'No completed tasks yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Tap "Add Task" or use AI to generate a full semester timetable.
            </Text>
          </View>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === 'completed';
            const priorityColor =
              task.priority === 'high'
                ? theme.colors.danger
                : task.priority === 'low'
                ? theme.colors.success
                : theme.colors.warning;

            return (
              <View key={task.id} style={[styles.taskCard, isDone && styles.taskCardDone]}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => toggleTaskStatus(task)}
                  activeOpacity={0.7}
                >
                  {isDone ? (
                    <CheckCircle2 size={24} color={theme.colors.success} />
                  ) : (
                    <Circle size={24} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>

                <View style={styles.taskInfo}>
                  <View style={styles.taskTopBadges}>
                    {task.subject && (
                      <View style={styles.subjectBadge}>
                        <Text style={styles.subjectBadgeText}>{task.subject.subject_code}</Text>
                      </View>
                    )}
                    <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
                      <Text style={[styles.priorityBadgeText, { color: priorityColor }]}>
                        {task.priority.toUpperCase()}
                      </Text>
                    </View>
                    {task.is_ai_generated && (
                      <View style={styles.aiBadge}>
                        <Sparkles size={10} color={theme.colors.primary} />
                        <Text style={styles.aiBadgeText}>AI</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                    {task.title}
                  </Text>

                  {task.description && (
                    <Text style={styles.taskDesc} numberOfLines={2}>
                      {task.description}
                    </Text>
                  )}

                  <View style={styles.taskMetaRow}>
                    <View style={styles.metaItem}>
                      <Calendar size={12} color={theme.colors.textMuted} />
                      <Text style={styles.metaText}>{task.study_date}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={theme.colors.textMuted} />
                      <Text style={styles.metaText}>
                        {task.start_time.substring(0, 5)} - {task.end_time.substring(0, 5)}
                      </Text>
                    </View>
                    {task.reminder_enabled && (
                      <View style={styles.metaItem}>
                        <Bell size={12} color={theme.colors.primary} />
                        <Text style={[styles.metaText, { color: theme.colors.primary }]}>
                          {task.reminder_minutes_before}m before
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions: Edit / Delete */}
                <View style={styles.taskActions}>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => openEditModal(task)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleDeleteTask(task)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Task Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTask ? 'Edit Study Task' : 'Add Study Task'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Task Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Unit 3 SQL Joins Practice"
                value={formTitle}
                onChangeText={setFormTitle}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.inputLabel}>Description / Goal</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Key topics, textbook page numbers, formulas..."
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.inputLabel}>Select Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {subjectsList.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.chipBtn,
                      formSubjectId === s.id && styles.chipBtnActive,
                    ]}
                    onPress={() => setFormSubjectId(s.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formSubjectId === s.id && styles.chipTextActive,
                      ]}
                    >
                      {s.code || s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Study Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-10-15"
                value={formDate}
                onChangeText={setFormDate}
                placeholderTextColor={theme.colors.textMuted}
              />

              <View style={styles.timeRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Start Time (HH:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09:00"
                    value={formStartTime}
                    onChangeText={setFormStartTime}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>End Time (HH:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10:30"
                    value={formEndTime}
                    onChangeText={setFormEndTime}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityBtn,
                      formPriority === p && styles.priorityBtnActive,
                    ]}
                    onPress={() => setFormPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        formPriority === p && styles.priorityTextActive,
                      ]}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Reminder Before Start</Text>
              <View style={styles.priorityRow}>
                {[5, 10, 15, 30].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.priorityBtn,
                      formReminderMin === mins && styles.priorityBtnActive,
                    ]}
                    onPress={() => setFormReminderMin(mins)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        formReminderMin === mins && styles.priorityTextActive,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveTask}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingTask ? 'Update Task' : 'Save Task'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  aiIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiBannerText: {
    flex: 1,
    marginRight: 8,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  aiBannerSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 2,
  },
  savedPlansBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  savedPlansBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'flex-start',
  },
  taskCardDone: {
    backgroundColor: '#F9FAFB',
    opacity: 0.8,
  },
  checkboxTouch: {
    marginRight: 12,
    marginTop: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTopBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  subjectBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 18,
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
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  taskActions: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 8,
  },
  actionIconBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  chipBtn: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  chipBtnActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  priorityBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  priorityTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
