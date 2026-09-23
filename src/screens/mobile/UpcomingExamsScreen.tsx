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
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Bell,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Sparkles,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import type { Exam } from '@/types';
import {
  getStudentUpcomingExams,
  syncStudentExamNotifications,
} from '@/service/exam';

export default function UpcomingExamsScreen() {
  const { user } = useAuth();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const data = await getStudentUpcomingExams(user.id);
      setExams(data);
      // Automatically synchronize local notifications
      await syncStudentExamNotifications(user.id);
    } catch (err) {
      console.error('Error loading exams:', err);
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

  const handleManualSync = async () => {
    if (!user) return;
    setSyncing(true);

    try {
      await syncStudentExamNotifications(user.id);
      const data = await getStudentUpcomingExams(user.id);
      setExams(data);
      Alert.alert(
        'Synced Successfully',
        'Your 7-day, 3-day, and 1-day phone reminders are up-to-date with teacher exam schedules.'
      );
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message || 'Failed to sync notifications');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader title="Upcoming Exams" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner about Automated Reminders */}
        <View style={styles.notifBanner}>
          <View style={styles.notifBannerIcon}>
            <Bell size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.notifBannerText}>
            <Text style={styles.notifBannerTitle}>Automated Phone Reminders</Text>
            <Text style={styles.notifBannerSub}>
              You will automatically receive alerts at 7 days, 3 days, and 1 day before every exam.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={handleManualSync}
            disabled={syncing}
            activeOpacity={0.7}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <RefreshCw size={16} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Exams List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Curriculum Exam Schedule</Text>
          <Text style={styles.sectionCount}>{exams.length} Upcoming</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Fetching uploaded exam dates...</Text>
          </View>
        ) : exams.length === 0 ? (
          <View style={styles.emptyCard}>
            <GraduationCap size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Upcoming Exams Scheduled</Text>
            <Text style={styles.emptySub}>
              When teachers upload exam dates for your subjects, they will appear here with automatic countdown reminders.
            </Text>
          </View>
        ) : (
          exams.map((exam) => {
            const days = exam.days_remaining ?? 0;
            const isCritical = days <= 3;
            const isUrgent = days <= 7 && days > 3;

            const countdownBg = isCritical
              ? theme.colors.dangerBg
              : isUrgent
              ? theme.colors.warningBg
              : theme.colors.primaryLight;

            const countdownColor = isCritical
              ? theme.colors.danger
              : isUrgent
              ? theme.colors.warning
              : theme.colors.primary;

            return (
              <View key={exam.id} style={styles.examCard}>
                {/* Top Row: Subject & Countdown */}
                <View style={styles.cardHeader}>
                  <View style={styles.subjectBox}>
                    <Text style={styles.subjectCode}>{exam.subject?.subject_code}</Text>
                    <Text style={styles.subjectName} numberOfLines={1}>
                      {exam.subject?.subject_name}
                    </Text>
                  </View>

                  <View style={[styles.countdownBadge, { backgroundColor: countdownBg }]}>
                    <Text style={[styles.countdownText, { color: countdownColor }]}>
                      {days === 0
                        ? 'TODAY'
                        : days === 1
                        ? 'TOMORROW'
                        : `${days} DAYS LEFT`}
                    </Text>
                  </View>
                </View>

                {/* Exam Title */}
                <Text style={styles.examTitle}>{exam.exam_title}</Text>

                {/* Date & Time */}
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

                {/* Instructions if any */}
                {exam.instructions && (
                  <View style={styles.instructionsBox}>
                    <FileText size={14} color={theme.colors.textMuted} style={{ marginTop: 2 }} />
                    <Text style={styles.instructionsText}>{exam.instructions}</Text>
                  </View>
                )}

                {/* Reminders Timeline Status */}
                <View style={styles.reminderTimeline}>
                  <View style={styles.reminderPill}>
                    <Bell size={10} color={days > 7 ? theme.colors.textMuted : theme.colors.success} />
                    <Text style={[styles.reminderPillText, days <= 7 && styles.reminderPillTextActive]}>
                      7 Days
                    </Text>
                  </View>
                  <View style={styles.timelineLine} />
                  <View style={styles.reminderPill}>
                    <Bell size={10} color={days > 3 ? theme.colors.textMuted : theme.colors.success} />
                    <Text style={[styles.reminderPillText, days <= 3 && styles.reminderPillTextActive]}>
                      3 Days
                    </Text>
                  </View>
                  <View style={styles.timelineLine} />
                  <View style={styles.reminderPill}>
                    <Bell size={10} color={days > 1 ? theme.colors.textMuted : theme.colors.success} />
                    <Text style={[styles.reminderPillText, days <= 1 && styles.reminderPillTextActive]}>
                      1 Day
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
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
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  notifBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifBannerText: {
    flex: 1,
    marginRight: 8,
  },
  notifBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  notifBannerSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  syncBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  examCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  subjectBox: {
    flex: 1,
    marginRight: 10,
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
  countdownBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '800',
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
    marginBottom: 10,
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
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  reminderTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  reminderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderPillText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  reminderPillTextActive: {
    color: theme.colors.success,
    fontWeight: '700',
  },
  timelineLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 8,
  },
});
