import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ClipboardList,
  Calendar,
  Clock,
  BookOpen,
  Link2,
  AlertCircle,
  ExternalLink,
  Download,
  FileText,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getStudentAssignments } from '@/service/assignments';
import { useAuth } from '@/context/AuthContext';
import { downloadPdf } from '@/utils/fileDownloader';
import type { Assignment } from '@/types';

export default function StudentAssignmentsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getStudentAssignments(user.id);
      setAssignments(data);
    } catch (err) {
      console.error('Error loading student assignments:', err);
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

  const handleDownloadAttachment = async (a: Assignment) => {
    if (!a.attachment_url || downloadingId) return;
    setDownloadingId(a.id);
    try {
      await downloadPdf(a.attachment_url, `${a.title}_assignment`);
    } catch (err) {
      Alert.alert('Download Error', 'Could not download assignment attachment.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenAttachment = async (url?: string | null) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert('Error', 'Unable to open attachment URL.');
    }
  };

  // Get distinct subjects for filter
  const subjectsMap = new Map<string, string>();
  assignments.forEach((a) => {
    if (a.subject?.id && a.subject?.subject_code) {
      subjectsMap.set(a.subject.id, a.subject.subject_code);
    }
  });
  const subjectFilters = Array.from(subjectsMap.entries()).map(([id, code]) => ({
    id,
    code,
  }));

  const filteredAssignments = assignments.filter((a) => {
    if (selectedSubjectFilter === 'all') return true;
    return a.subject_id === selectedSubjectFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="My Assignments" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <ClipboardList size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Course Assignments</Text>
            <Text style={styles.bannerSubtitle}>
              View homework, lab tasks, and problem sets assigned by your instructors.
            </Text>
          </View>
        </View>

        {/* Subject Filter Pills */}
        {subjectFilters.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, selectedSubjectFilter === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedSubjectFilter('all')}
            >
              <Text style={[styles.filterChipText, selectedSubjectFilter === 'all' && styles.filterChipTextActive]}>
                All ({assignments.length})
              </Text>
            </TouchableOpacity>
            {subjectFilters.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.filterChip, selectedSubjectFilter === s.id && styles.filterChipActive]}
                onPress={() => setSelectedSubjectFilter(s.id)}
              >
                <Text style={[styles.filterChipText, selectedSubjectFilter === s.id && styles.filterChipTextActive]}>
                  {s.code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Assignments List */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading assignments...</Text>
          </View>
        ) : filteredAssignments.length === 0 ? (
          <View style={styles.emptyBox}>
            <AlertCircle size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Assignments Found</Text>
            <Text style={styles.emptySub}>
              {assignments.length === 0
                ? 'Your instructors have not published any assignments yet.'
                : 'No assignments match the selected subject filter.'}
            </Text>
          </View>
        ) : (
          filteredAssignments.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={styles.subjectBadge}>
                    <Text style={styles.subjectBadgeText}>
                      {a.subject?.subject_code || 'Subject'}
                    </Text>
                  </View>
                  {a.unit && (
                    <View style={styles.unitBadge}>
                      <Text style={styles.unitBadgeText}>
                        Unit {a.unit.unit_number}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.marksBadge}>{a.max_marks} Marks</Text>
              </View>

              <Text style={styles.cardTitle}>{a.title}</Text>

              {a.description ? (
                <Text style={styles.cardDesc}>{a.description}</Text>
              ) : null}

              {/* Attachment link if available */}
              {a.attachment_url ? (
                <View style={styles.attachmentActionRow}>
                  <TouchableOpacity
                    style={styles.attachmentBtn}
                    onPress={() => handleDownloadAttachment(a)}
                    disabled={downloadingId === a.id}
                    activeOpacity={0.7}
                  >
                    {downloadingId === a.id ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <Download size={14} color="#2563EB" />
                    )}
                    <Text style={styles.attachmentBtnText}>
                      {downloadingId === a.id ? 'Downloading...' : 'Download PDF / File'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.attachmentOpenBtn}
                    onPress={() => handleOpenAttachment(a.attachment_url)}
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={14} color="#64748B" />
                    <Text style={styles.attachmentOpenBtnText}>Open</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <View style={styles.metaItem}>
                  <Calendar size={13} color="#D97706" />
                  <Text style={styles.dueDateText}>Due Date: {a.due_date}</Text>
                </View>
                {a.due_time ? (
                  <View style={styles.metaItem}>
                    <Clock size={13} color={theme.colors.textMuted} />
                    <Text style={styles.dueTimeText}>{a.due_time}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
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
  banner: {
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
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    lineHeight: 15,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
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
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  marksBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  attachmentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  attachmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  attachmentOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  attachmentOpenBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
  dueDateText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '700',
  },
  dueTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
});
