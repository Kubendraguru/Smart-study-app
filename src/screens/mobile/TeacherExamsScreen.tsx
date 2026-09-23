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
} from 'react-native';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Plus,
  Trash2,
  Edit3,
  BookOpen,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Exam } from '@/types';
import {
  getTeacherExams,
  createExam,
  updateExam,
  deleteExam,
} from '@/service/exam';
import { getLocalDateString } from '@/service/studyPlanner';

export default function TeacherExamsScreen() {
  const { user } = useAuth();

  const [exams, setExams] = useState<Exam[]>([]);
  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(getLocalDateString());
  const [formTime, setFormTime] = useState('09:30');
  const [formLocation, setFormLocation] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [saving, setSaving] = useState(false);

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

  const loadExams = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const data = await getTeacherExams(user.id);
      setExams(data);
    } catch (err) {
      console.error('Error loading teacher exams:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubjects();
    loadExams();
  }, [loadSubjects, loadExams]);

  const onRefresh = () => {
    setRefreshing(true);
    loadExams();
  };

  const openCreateModal = () => {
    setEditingExam(null);
    setFormSubjectId(subjectsList[0]?.id || '');
    setFormTitle('');
    setFormDate(getLocalDateString());
    setFormTime('09:30');
    setFormLocation('');
    setFormInstructions('');
    setModalVisible(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam);
    setFormSubjectId(exam.subject_id);
    setFormTitle(exam.exam_title);
    setFormDate(exam.exam_date);
    setFormTime(exam.exam_time ? exam.exam_time.substring(0, 5) : '09:30');
    setFormLocation(exam.location || '');
    setFormInstructions(exam.instructions || '');
    setModalVisible(true);
  };

  const handleSaveExam = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Required Field', 'Please enter an exam title.');
      return;
    }
    if (!formSubjectId) {
      Alert.alert('Required Field', 'Please select a subject.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      if (editingExam) {
        const res = await updateExam(editingExam.id, {
          subject_id: formSubjectId,
          exam_title: formTitle.trim(),
          exam_date: formDate,
          exam_time: formTime,
          location: formLocation.trim() || null,
          instructions: formInstructions.trim() || null,
        });

        if (!res.success) {
          Alert.alert('Error', res.error || 'Failed to update exam.');
          return;
        }
      } else {
        const res = await createExam({
          teacher_id: user.id,
          subject_id: formSubjectId,
          exam_title: formTitle.trim(),
          exam_date: formDate,
          exam_time: formTime,
          location: formLocation.trim() || null,
          instructions: formInstructions.trim() || null,
        });

        if (!res.success) {
          Alert.alert('Error', res.error || 'Failed to create exam.');
          return;
        }
      }

      setModalVisible(false);
      loadExams();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExam = (exam: Exam) => {
    Alert.alert('Delete Exam', `Are you sure you want to delete "${exam.exam_title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteExam(exam.id);
          if (res.success) {
            loadExams();
          } else {
            Alert.alert('Error', res.error || 'Failed to delete exam.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader title="Manage Exams" showBack={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Card */}
        <View style={styles.topCard}>
          <View style={styles.topCardHeader}>
            <View>
              <Text style={styles.topCardTitle}>Curriculum Exam Dates</Text>
              <Text style={styles.topCardSub}>
                Uploading exam dates automatically triggers 7-day, 3-day, and 1-day reminders for all enrolled students.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addExamBtn}
            onPress={openCreateModal}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addExamBtnText}>Add New Exam</Text>
          </TouchableOpacity>
        </View>

        {/* Exams List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Scheduled Exams</Text>
          <Text style={styles.sectionCount}>{exams.length} Total</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading exams...</Text>
          </View>
        ) : exams.length === 0 ? (
          <View style={styles.emptyCard}>
            <GraduationCap size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Exams Created</Text>
            <Text style={styles.emptySub}>
              Tap "Add New Exam" to schedule assessments and notify your students.
            </Text>
          </View>
        ) : (
          exams.map((exam) => (
            <View key={exam.id} style={styles.examCard}>
              <View style={styles.examHeader}>
                <View style={styles.subjectBox}>
                  <Text style={styles.subjectCode}>{exam.subject?.subject_code}</Text>
                  <Text style={styles.subjectName} numberOfLines={1}>
                    {exam.subject?.subject_name}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEditModal(exam)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteExam(exam)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.examTitle}>{exam.exam_title}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Calendar size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{exam.formatted_date || exam.exam_date}</Text>
                </View>

                {exam.exam_time && (
                  <View style={styles.metaItem}>
                    <Clock size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.metaText}>{exam.exam_time.substring(0, 5)}</Text>
                  </View>
                )}

                {exam.location && (
                  <View style={styles.metaItem}>
                    <MapPin size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.metaText}>{exam.location}</Text>
                  </View>
                )}
              </View>

              {exam.instructions && (
                <View style={styles.instructionsBox}>
                  <FileText size={14} color={theme.colors.textMuted} style={{ marginTop: 2 }} />
                  <Text style={styles.instructionsText}>{exam.instructions}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Exam Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingExam ? 'Edit Exam Schedule' : 'Schedule New Exam'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Select Subject *</Text>
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

              <Text style={styles.inputLabel}>Exam Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Model Practical Exam II"
                value={formTitle}
                onChangeText={setFormTitle}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.inputLabel}>Exam Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-10-25"
                value={formDate}
                onChangeText={setFormDate}
                placeholderTextColor={theme.colors.textMuted}
              />

              <View style={styles.timeRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Start Time (HH:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09:30"
                    value={formTime}
                    onChangeText={setFormTime}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Hall / Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Hall 204, CSE Block"
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Instructions / Syllabus Notes</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Bring calculator, ID card, covers Unit 1 to 3..."
                value={formInstructions}
                onChangeText={setFormInstructions}
                multiline
                placeholderTextColor={theme.colors.textMuted}
              />
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
                onPress={handleSaveExam}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingExam ? 'Update Exam' : 'Publish Exam'}
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
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topCardHeader: {
    marginBottom: 14,
  },
  topCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  topCardSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  addExamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  addExamBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    borderRadius: 16,
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
  examCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subjectBox: {
    flex: 1,
    marginRight: 8,
  },
  subjectCode: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  instructionsBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  instructionsText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 15,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
