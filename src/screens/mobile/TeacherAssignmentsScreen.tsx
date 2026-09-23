import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ClipboardList,
  Plus,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  X,
  Check,
  AlertCircle,
  Edit3,
  Link2,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '@/service/assignments';
import { getSubjects } from '@/service/subject';
import { supabase } from '@/lib/supabase';
import type { Assignment } from '@/types';

export default function TeacherAssignmentsScreen() {
  const navigation = useNavigation<any>();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [maxMarks, setMaxMarks] = useState('100');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [assigns, subjs] = await Promise.all([
        getAssignments(),
        getSubjects(),
      ]);
      setAssignments(assigns);
      setSubjects(subjs);
      if (subjs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subjs[0].id);
      }
    } catch (err) {
      console.error('Error loading assignments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load units when selected subject changes in modal
  useEffect(() => {
    async function loadUnits() {
      if (!selectedSubjectId) {
        setUnits([]);
        setSelectedUnitId('');
        return;
      }
      try {
        const { data } = await supabase
          .from('units')
          .select('*')
          .eq('subject_id', selectedSubjectId)
          .order('unit_number', { ascending: true });
        setUnits(data || []);
        if (!editingId) {
          if (data && data.length > 0) {
            setSelectedUnitId(data[0].id);
          } else {
            setSelectedUnitId('');
          }
        }
      } catch (err) {
        console.error('Error loading units:', err);
      }
    }
    loadUnits();
  }, [selectedSubjectId, editingId]);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDueDate('');
    setDueTime('23:59');
    setMaxMarks('100');
    setAttachmentUrl('');
    if (subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
    setModalVisible(true);
  };

  const openEditModal = (item: Assignment) => {
    setEditingId(item.id);
    setSelectedSubjectId(item.subject_id);
    setSelectedUnitId(item.unit_id || '');
    setTitle(item.title);
    setDescription(item.description || '');
    setDueDate(item.due_date);
    setDueTime(item.due_time || '23:59');
    setMaxMarks(String(item.max_marks || 100));
    setAttachmentUrl(item.attachment_url || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !selectedSubjectId || !dueDate.trim()) {
      Alert.alert('Required Fields', 'Please fill in Title, Subject, and Due Date (YYYY-MM-DD).');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateAssignment(editingId, {
          title: title.trim(),
          description: description.trim(),
          dueDate: dueDate.trim(),
          dueTime: dueTime.trim() || '23:59',
          maxMarks: Number(maxMarks) || 100,
          attachmentUrl: attachmentUrl.trim() || undefined,
          unitId: selectedUnitId || null,
        });
      } else {
        await createAssignment({
          subjectId: selectedSubjectId,
          unitId: selectedUnitId || null,
          title: title.trim(),
          description: description.trim(),
          dueDate: dueDate.trim(),
          dueTime: dueTime.trim() || '23:59',
          maxMarks: Number(maxMarks) || 100,
          attachmentUrl: attachmentUrl.trim() || undefined,
        });
      }

      setModalVisible(false);
      setEditingId(null);
      setTitle('');
      setDescription('');
      setDueDate('');
      setAttachmentUrl('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, assignTitle: string) => {
    Alert.alert('Delete Assignment', `Are you sure you want to delete "${assignTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAssignment(id);
            setAssignments((prev) => prev.filter((a) => a.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete assignment.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Manage Assignments" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create New Assignment</Text>
        </TouchableOpacity>

        {/* Assignments List */}
        <Text style={styles.sectionTitle}>Published Assignments ({assignments.length})</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading assignments...</Text>
          </View>
        ) : assignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <ClipboardList size={36} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Assignments Created</Text>
            <Text style={styles.emptySub}>
              Tap the button above to publish homework, projects, or lab assignments for your students.
            </Text>
          </View>
        ) : (
          assignments.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.subjectBadge}>
                  <Text style={styles.subjectBadgeText}>
                    {item.subject?.subject_code || 'Subject'}
                  </Text>
                </View>
                {item.unit && (
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitBadgeText}>
                      Unit {item.unit.unit_number}
                    </Text>
                  </View>
                )}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id, item.title)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {item.attachment_url && (
                <View style={styles.attachmentBadge}>
                  <Link2 size={12} color="#2563EB" />
                  <Text style={styles.attachmentBadgeText}>File Attached</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.metaItem}>
                  <Calendar size={13} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>Due: {item.due_date}</Text>
                </View>
                {item.due_time && (
                  <View style={styles.metaItem}>
                    <Clock size={13} color={theme.colors.textMuted} />
                    <Text style={styles.metaText}>{item.due_time}</Text>
                  </View>
                )}
                <Text style={styles.marksText}>{item.max_marks} Marks</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Assignment' : 'Create Assignment'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Subject */}
              <Text style={styles.inputLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, selectedSubjectId === s.id && styles.chipActive]}
                    onPress={() => setSelectedSubjectId(s.id)}
                  >
                    <Text style={[styles.chipText, selectedSubjectId === s.id && styles.chipTextActive]}>
                      {s.subject_code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Unit */}
              <Text style={styles.inputLabel}>Unit (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !selectedUnitId && styles.chipActive]}
                  onPress={() => setSelectedUnitId('')}
                >
                  <Text style={[styles.chipText, !selectedUnitId && styles.chipTextActive]}>
                    General (No Unit)
                  </Text>
                </TouchableOpacity>
                {units.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.chip, selectedUnitId === u.id && styles.chipActive]}
                    onPress={() => setSelectedUnitId(u.id)}
                  >
                    <Text style={[styles.chipText, selectedUnitId === u.id && styles.chipTextActive]}>
                      Unit {u.unit_number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={styles.inputLabel}>Assignment Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Assignment 1: Stack & Queue Applications"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Instructions / Details</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe assignment problem statement, formatting guidelines..."
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              {/* Due Date & Marks */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="2026-10-15"
                    placeholderTextColor={theme.colors.textMuted}
                    value={dueDate}
                    onChangeText={setDueDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Max Marks</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="100"
                    placeholderTextColor={theme.colors.textMuted}
                    value={maxMarks}
                    onChangeText={setMaxMarks}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Optional Attachment Link */}
              <Text style={styles.inputLabel}>Attachment / Reference Link (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://... (PDF, Document, or Problem Sheet link)"
                placeholderTextColor={theme.colors.textMuted}
                value={attachmentUrl}
                onChangeText={setAttachmentUrl}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.submitModalBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalBtnText}>
                    {editingId ? 'Save Changes' : 'Publish Assignment'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  subjectBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  unitBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  editBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  attachmentBadgeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 10,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  marksText: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
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
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  submitModalBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
