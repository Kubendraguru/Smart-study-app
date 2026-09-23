import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {
  Bell,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  X,
  Volume2,
  Zap,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getAnnouncements } from '@/service/announcements';
import {
  getCustomTimedReminders,
  scheduleCustomTimedNotification,
  deleteCustomTimedReminder,
  sendInstantTestNotification,
  requestNotificationPermissions,
  CustomTimedReminder,
} from '@/service/notifications';
import type { Announcement } from '@/types';

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<'announcements' | 'timed_reminders'>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reminders, setReminders] = useState<CustomTimedReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Timed Alarm Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [reminderDate, setReminderDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [reminderTime, setReminderTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });
  const [scheduling, setScheduling] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [annData, remData] = await Promise.all([
        getAnnouncements(),
        getCustomTimedReminders(),
      ]);
      setAnnouncements(annData);
      setReminders(remData);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTestNotification = async () => {
    const res = await sendInstantTestNotification(
      '🔔 Smart Study Notification Test',
      'Your phone push notifications, sound, and study alarms are working!'
    );
    if (res.success) {
      Alert.alert('Notification Sent', 'A test alert has been delivered to your phone banner.');
    } else {
      Alert.alert('Notice', res.error || 'Please enable notifications in device settings.');
    }
  };

  const handleSetPresetTime = (minutesAhead: number) => {
    const target = new Date();
    target.setMinutes(target.getMinutes() + minutesAhead);
    const dateStr = target.toISOString().split('T')[0];
    const h = String(target.getHours()).padStart(2, '0');
    const m = String(target.getMinutes()).padStart(2, '0');
    setReminderDate(dateStr);
    setReminderTime(`${h}:${m}`);
  };

  const handleScheduleReminder = async () => {
    if (!reminderTitle.trim() || !reminderDate.trim() || !reminderTime.trim()) {
      Alert.alert('Required Fields', 'Please provide a title, date (YYYY-MM-DD), and time (HH:MM).');
      return;
    }

    setScheduling(true);
    try {
      const res = await scheduleCustomTimedNotification({
        title: reminderTitle.trim(),
        body: reminderNote.trim() || undefined,
        date: reminderDate.trim(),
        time: reminderTime.trim(),
        type: 'study_alarm',
      });

      if (res.success) {
        Alert.alert(
          'Alarm Scheduled! ⏰',
          `Your phone will alert you at ${reminderTime} on ${reminderDate}.`
        );
        setReminderTitle('');
        setReminderNote('');
        setModalVisible(false);
        const updated = await getCustomTimedReminders();
        setReminders(updated);
      } else {
        Alert.alert('Could Not Schedule', res.error || 'Failed to schedule alarm.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to schedule notification.');
    } finally {
      setScheduling(false);
    }
  };

  const handleDeleteReminder = async (id: string, title: string) => {
    Alert.alert('Cancel Reminder', `Do you want to cancel the alarm for "${title}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomTimedReminder(id);
          const updated = await getCustomTimedReminders();
          setReminders(updated);
        },
      },
    ]);
  };

  const getPriorityTheme = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return {
          badgeBg: '#FEE2E2',
          badgeText: '#DC2626',
          iconBg: '#FEE2E2',
          iconColor: '#DC2626',
          label: 'High Priority',
        };
      case 'medium':
        return {
          badgeBg: '#FEF3C7',
          badgeText: '#D97706',
          iconBg: '#FEF3C7',
          iconColor: '#D97706',
          label: 'Important',
        };
      case 'low':
      default:
        return {
          badgeBg: '#DBEAFE',
          badgeText: '#2563EB',
          iconBg: '#DBEAFE',
          iconColor: '#2563EB',
          label: 'Notice',
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Notifications & Alarms" showBack />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'announcements' && styles.tabButtonActive]}
          onPress={() => setActiveTab('announcements')}
          activeOpacity={0.8}
        >
          <Bell size={15} color={activeTab === 'announcements' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.tabButtonText, activeTab === 'announcements' && styles.tabButtonTextActive]}>
            Announcements ({announcements.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'timed_reminders' && styles.tabButtonActive]}
          onPress={() => setActiveTab('timed_reminders')}
          activeOpacity={0.8}
        >
          <Clock size={15} color={activeTab === 'timed_reminders' ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.tabButtonText, activeTab === 'timed_reminders' && styles.tabButtonTextActive]}>
            Timed Alarms ({reminders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notifications & alarms...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'announcements' ? (
            /* Tab A: Faculty Announcements */
            announcements.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Bell size={32} color={theme.colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No Announcements</Text>
                <Text style={styles.emptySubtitle}>
                  You're all caught up! Faculty announcements and notices will appear here.
                </Text>
              </View>
            ) : (
              announcements.map((item) => {
                const pTheme = getPriorityTheme(item.priority);
                return (
                  <View key={item.id} style={styles.notifCard}>
                    <View style={[styles.iconBox, { backgroundColor: pTheme.iconBg }]}>
                      <Bell size={18} color={pTheme.iconColor} />
                    </View>
                    <View style={styles.content}>
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.priorityBadge, { backgroundColor: pTheme.badgeBg }]}>
                          <Text style={[styles.priorityText, { color: pTheme.badgeText }]}>
                            {pTheme.label}
                          </Text>
                        </View>
                        <Text style={styles.timeText}>{item.date || 'Recent'}</Text>
                      </View>

                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.message}>{item.message}</Text>

                      <View style={styles.metaRow}>
                        <View style={styles.subjectChip}>
                          <Text style={styles.subjectChipText}>
                            {item.subject_name || item.subject || 'Curriculum'}
                          </Text>
                        </View>
                        {item.teacher_name && (
                          <Text style={styles.teacherNameText}>By {item.teacher_name}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )
          ) : (
            /* Tab B: Timed Phone Reminders & Alarms */
            <View>
              {/* Quick Action Buttons */}
              <View style={styles.timedActionsRow}>
                <TouchableOpacity
                  style={styles.newAlarmBtn}
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.newAlarmBtnText}>Set Timed Alarm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.testNotifBtn}
                  onPress={handleTestNotification}
                  activeOpacity={0.8}
                >
                  <Volume2 size={16} color={theme.colors.primary} />
                  <Text style={styles.testNotifBtnText}>Test Push Alert</Text>
                </TouchableOpacity>
              </View>

              {/* Informative Banner */}
              <View style={styles.alarmInfoBanner}>
                <Zap size={20} color="#0284C7" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alarmInfoTitle}>Phone Push Notifications</Text>
                  <Text style={styles.alarmInfoSubtitle}>
                    Scheduled alarms ring directly on your phone with sound and banners even when the app is closed.
                  </Text>
                </View>
              </View>

              {/* Reminders List */}
              {reminders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBox}>
                    <Clock size={32} color={theme.colors.textMuted} />
                  </View>
                  <Text style={styles.emptyTitle}>No Active Timed Alarms</Text>
                  <Text style={styles.emptySubtitle}>
                    Set a time for your study session, assignment deadline, or exam revision to get alerted on your phone!
                  </Text>
                  <TouchableOpacity
                    style={[styles.newAlarmBtn, { marginTop: 16 }]}
                    onPress={() => setModalVisible(true)}
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={styles.newAlarmBtnText}>Create First Alarm</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                reminders.map((rem) => (
                  <View key={rem.id} style={styles.alarmCard}>
                    <View style={styles.alarmTimeBadge}>
                      <Clock size={16} color={theme.colors.primary} />
                      <Text style={styles.alarmTimeText}>{rem.scheduled_time}</Text>
                    </View>

                    <View style={styles.alarmContent}>
                      <Text style={styles.alarmTitle}>{rem.title}</Text>
                      {rem.body && <Text style={styles.alarmBody}>{rem.body}</Text>}
                      <View style={styles.alarmMeta}>
                        <Calendar size={12} color={theme.colors.textMuted} />
                        <Text style={styles.alarmDateText}>{rem.scheduled_date}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDeleteReminder(rem.id, rem.title)}
                      style={styles.deleteAlarmBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={16} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Schedule Timed Notification Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Clock size={20} color={theme.colors.primary} />
                <Text style={styles.modalTitle}>Set Timed Phone Alarm</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Quick Presets */}
              <Text style={styles.modalSectionLabel}>Quick Time Presets</Text>
              <View style={styles.presetRow}>
                <TouchableOpacity style={styles.presetChip} onPress={() => handleSetPresetTime(15)}>
                  <Text style={styles.presetChipText}>+15 Mins</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => handleSetPresetTime(30)}>
                  <Text style={styles.presetChipText}>+30 Mins</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => handleSetPresetTime(60)}>
                  <Text style={styles.presetChipText}>+1 Hour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => handleSetPresetTime(180)}>
                  <Text style={styles.presetChipText}>+3 Hours</Text>
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.inputLabel}>Reminder Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Study Unit 3 Trees & Graphs"
                placeholderTextColor={theme.colors.textMuted}
                value={reminderTitle}
                onChangeText={setReminderTitle}
              />

              {/* Date & Time Row */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="2026-09-24"
                    placeholderTextColor={theme.colors.textMuted}
                    value={reminderDate}
                    onChangeText={setReminderDate}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Time (HH:MM) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="19:30"
                    placeholderTextColor={theme.colors.textMuted}
                    value={reminderTime}
                    onChangeText={setReminderTime}
                  />
                </View>
              </View>

              {/* Note / Message */}
              <Text style={styles.inputLabel}>Notification Note (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Details to show on your phone banner..."
                placeholderTextColor={theme.colors.textMuted}
                value={reminderNote}
                onChangeText={setReminderNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.scheduleBtn, scheduling && { opacity: 0.7 }]}
                onPress={handleScheduleReminder}
                disabled={scheduling}
                activeOpacity={0.8}
              >
                {scheduling ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.scheduleBtnContent}>
                    <Clock size={18} color="#FFFFFF" />
                    <Text style={styles.scheduleBtnText}>Schedule Phone Notification</Text>
                  </View>
                )}
              </TouchableOpacity>
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
    backgroundColor: theme.colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
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
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
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
  notifCard: {
    flexDirection: 'row',
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
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  teacherNameText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  timedActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  newAlarmBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    height: 44,
    gap: 6,
  },
  newAlarmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  testNotifBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    height: 44,
    gap: 6,
  },
  testNotifBtnText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  alarmInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  alarmInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 2,
  },
  alarmInfoSubtitle: {
    fontSize: 11,
    color: '#0284C7',
    lineHeight: 15,
  },
  alarmCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  alarmTimeBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  alarmTimeText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: 2,
  },
  alarmContent: {
    flex: 1,
  },
  alarmTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 2,
  },
  alarmBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  alarmMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alarmDateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  deleteAlarmBtn: {
    padding: 8,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  textArea: {
    height: 70,
    paddingTop: 10,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  scheduleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
