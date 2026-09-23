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
import {
  Plus,
  Send,
  Trash2,
  Bell,
  AlertCircle,
  X,
  CheckCircle2,
  Filter,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '@/service/announcements';
import { getSubjects } from '@/service/subject';
import type { Announcement } from '@/types';

export default function TeacherAnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [annData, subjs] = await Promise.all([
        getAnnouncements(),
        getSubjects().catch(() => []),
      ]);
      setAnnouncements(annData);
      setSubjects(subjs || []);
    } catch (err) {
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Required Fields', 'Please provide a title and announcement message.');
      return;
    }

    setSubmitting(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        subjectId: selectedSubjectId || null,
        priority,
      });

      setTitle('');
      setMessage('');
      setSelectedSubjectId('');
      setPriority('medium');
      setModalVisible(false);
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 3000);

      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not publish announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, annTitle: string) => {
    Alert.alert(
      'Delete Announcement',
      `Are you sure you want to remove "${annTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAnnouncement(id);
              setAnnouncements((prev) => prev.filter((a) => a.id !== id));
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete announcement.');
            }
          },
        },
      ]
    );
  };

  const getPriorityBadge = (p: 'high' | 'medium' | 'low') => {
    switch (p) {
      case 'high':
        return { bg: '#FEE2E2', color: '#DC2626', label: 'High Priority' };
      case 'medium':
        return { bg: '#FEF3C7', color: '#D97706', label: 'Important' };
      case 'low':
      default:
        return { bg: '#DBEAFE', color: '#2563EB', label: 'Notice' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Announcements"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      {successBanner && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={18} color="#059669" />
          <Text style={styles.successText}>Announcement broadcasted to all students!</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Info Card */}
          <View style={styles.infoCard}>
            <Bell size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Broadcast exam updates, assignment notices, and schedule alerts directly to student devices.
            </Text>
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Published Announcements</Text>
            <Text style={styles.sectionCount}>{announcements.length} Total</Text>
          </View>

          {announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Bell size={32} color={theme.colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Announcements Yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button in the header to publish your first announcement to students.
              </Text>
            </View>
          ) : (
            announcements.map((item) => {
              const badge = getPriorityBadge(item.priority);
              return (
                <View key={item.id} style={styles.announcementCard}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.priorityBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.priorityText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <View style={styles.headerMeta}>
                      <Text style={styles.dateText}>{item.date || 'Recent'}</Text>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item.id, item.title)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMessage}>{item.message}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.subjectBadge}>
                      <Text style={styles.subjectBadgeText}>{item.subject_name || item.subject || 'All Subjects'}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Modal Form for New Announcement */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Title */}
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., IA-2 Test Syllabus Released"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Subject Selector */}
            <Text style={styles.inputLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedSubjectId && styles.chipActive]}
                onPress={() => setSelectedSubjectId('')}
              >
                <Text style={[styles.chipText, !selectedSubjectId && styles.chipTextActive]}>General / All</Text>
              </TouchableOpacity>
              {subjects.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, selectedSubjectId === s.id && styles.chipActive]}
                  onPress={() => setSelectedSubjectId(s.id)}
                >
                  <Text style={[styles.chipText, selectedSubjectId === s.id && styles.chipTextActive]}>
                    {s.subject_code || s.subject_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Priority Selector */}
            <Text style={styles.inputLabel}>Priority Level</Text>
            <View style={styles.prioritySelectorRow}>
              {(['high', 'medium', 'low'] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      isSelected && styles.priorityOptionActive,
                      isSelected && p === 'high' && { backgroundColor: '#DC2626' },
                      isSelected && p === 'medium' && { backgroundColor: '#D97706' },
                      isSelected && p === 'low' && { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        isSelected && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Message Body */}
            <Text style={styles.inputLabel}>Message Content *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Write the details of the announcement..."
              placeholderTextColor={theme.colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Send size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Broadcast to Students</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  successText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
    fontWeight: '600',
  },
  sectionHeaderRow: {
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
  sectionCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
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
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  cardMessage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.primary,
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
