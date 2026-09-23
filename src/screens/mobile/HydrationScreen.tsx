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
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Droplets,
  Plus,
  Clock,
  Target,
  Trash2,
  Bell,
  CheckCircle2,
  Calendar,
  Settings,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import type { HydrationLog, StudentNotificationSettings } from '@/types';
import {
  getTodayHydration,
  logWaterIntake,
  deleteHydrationLog,
  getStudentNotificationSettings,
  updateStudentNotificationSettings,
} from '@/service/hydration';
import { requestNotificationPermissions } from '@/service/notifications';

export default function HydrationScreen() {
  const { user } = useAuth();

  const [totalMl, setTotalMl] = useState(0);
  const [logs, setLogs] = useState<HydrationLog[]>([]);
  const [settings, setSettings] = useState<StudentNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingAmount, setLoggingAmount] = useState(false);

  // Settings edit state
  const [goalMl, setGoalMl] = useState('2000');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('22:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [todayData, userSettings] = await Promise.all([
        getTodayHydration(user.id),
        getStudentNotificationSettings(user.id),
      ]);

      setTotalMl(todayData.totalMl);
      setLogs(todayData.logs);
      setSettings(userSettings);

      setGoalMl(String(userSettings.hydration_daily_goal_ml || 2000));
      setStartTime(userSettings.hydration_start_time?.substring(0, 5) || '08:00');
      setEndTime(userSettings.hydration_end_time?.substring(0, 5) || '22:00');
      setReminderEnabled(userSettings.hydration_enabled || false);
    } catch (err) {
      console.error('Error loading hydration data:', err);
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

  const handleAddWater = async (amount: number) => {
    if (!user) return;
    setLoggingAmount(true);

    try {
      const res = await logWaterIntake(user.id, amount);
      if (res.success && res.log) {
        setTotalMl((prev) => prev + amount);
        setLogs((prev) => [res.log!, ...prev]);
      } else {
        Alert.alert('Error', res.error || 'Failed to record intake');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong');
    } finally {
      setLoggingAmount(false);
    }
  };

  const handleDeleteLog = (log: HydrationLog) => {
    Alert.alert('Remove Entry', `Remove ${log.amount_ml} ml from today's log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteHydrationLog(log.id);
          if (res.success) {
            setTotalMl((prev) => Math.max(0, prev - log.amount_ml));
            setLogs((prev) => prev.filter((l) => l.id !== log.id));
          }
        },
      },
    ]);
  };

  const handleToggleReminder = async (enabled: boolean) => {
    if (!user) return;

    if (enabled) {
      const hasPerm = await requestNotificationPermissions();
      if (!hasPerm) {
        Alert.alert(
          'Notifications Required',
          'Please allow notifications to receive water break alerts every 45 minutes.'
        );
      }
    }

    setReminderEnabled(enabled);
    await updateStudentNotificationSettings(user.id, {
      hydration_enabled: enabled,
      hydration_interval_minutes: 45,
      hydration_start_time: startTime,
      hydration_end_time: endTime,
      hydration_daily_goal_ml: Number(goalMl) || 2000,
    });
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    const goalNum = Number(goalMl) || 2000;

    await updateStudentNotificationSettings(user.id, {
      hydration_enabled: reminderEnabled,
      hydration_interval_minutes: 45,
      hydration_start_time: startTime,
      hydration_end_time: endTime,
      hydration_daily_goal_ml: goalNum,
    });

    Alert.alert('Saved', 'Hydration preferences and notification schedule updated.');
  };

  const dailyGoal = Number(goalMl) || 2000;
  const progressPercent = Math.min(100, Math.round((totalMl / dailyGoal) * 100));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader title="Water Hydration" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Water Progress Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Droplets size={32} color="#FFFFFF" />
          </View>

          <Text style={styles.heroIntakeVal}>{totalMl} <Text style={styles.heroIntakeUnit}>ml</Text></Text>
          <Text style={styles.heroGoalSub}>Daily Goal: {dailyGoal} ml ({progressPercent}%)</Text>

          {/* Liquid Progress Bar */}
          <View style={styles.liquidBarBg}>
            <View style={[styles.liquidBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {progressPercent >= 100 ? (
            <View style={styles.goalAchievedBadge}>
              <CheckCircle2 size={16} color="#FFFFFF" />
              <Text style={styles.goalAchievedText}>Daily Goal Achieved! 🎉</Text>
            </View>
          ) : (
            <Text style={styles.remainingText}>
              {dailyGoal - totalMl} ml remaining to reach your goal
            </Text>
          )}
        </View>

        {/* Quick Log Buttons */}
        <Text style={styles.sectionTitle}>Quick Water Add</Text>
        <View style={styles.quickAddRow}>
          <TouchableOpacity
            style={styles.quickAddBtn}
            onPress={() => handleAddWater(250)}
            disabled={loggingAmount}
            activeOpacity={0.7}
          >
            <Droplets size={20} color={theme.colors.primary} />
            <Text style={styles.quickAddAmount}>+250 ml</Text>
            <Text style={styles.quickAddSub}>Small Cup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAddBtn}
            onPress={() => handleAddWater(500)}
            disabled={loggingAmount}
            activeOpacity={0.7}
          >
            <Droplets size={20} color={theme.colors.primary} />
            <Text style={styles.quickAddAmount}>+500 ml</Text>
            <Text style={styles.quickAddSub}>Water Bottle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAddBtn}
            onPress={() => handleAddWater(750)}
            disabled={loggingAmount}
            activeOpacity={0.7}
          >
            <Droplets size={20} color={theme.colors.primary} />
            <Text style={styles.quickAddAmount}>+750 ml</Text>
            <Text style={styles.quickAddSub}>Large Flask</Text>
          </TouchableOpacity>
        </View>

        {/* 45-Minute Notification Settings Card */}
        <Text style={styles.sectionTitle}>45-Min Reminder Settings</Text>
        <View style={styles.settingsCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <View style={styles.iconTag}>
                <Bell size={16} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.switchLabel}>45-Minute Hydration Alerts</Text>
                <Text style={styles.switchSub}>
                  Receive rolling reminders between active study hours
                </Text>
              </View>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>

          {/* Time Window Settings */}
          <View style={styles.timeSettingsGrid}>
            <View style={styles.timeSettingItem}>
              <Text style={styles.settingInputLabel}>Start Time (HH:MM)</Text>
              <TextInput
                style={styles.settingInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="08:00"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.timeSettingItem}>
              <Text style={styles.settingInputLabel}>End Time (HH:MM)</Text>
              <TextInput
                style={styles.settingInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="22:00"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          {/* Daily Goal Input */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.settingInputLabel}>Daily Water Goal (ml)</Text>
            <TextInput
              style={styles.settingInput}
              value={goalMl}
              onChangeText={setGoalMl}
              keyboardType="numeric"
              placeholder="2000"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.saveSettingsBtn}
            onPress={handleSaveSettings}
            activeOpacity={0.8}
          >
            <Text style={styles.saveSettingsBtnText}>Update Reminder Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Today's History Log */}
        <Text style={styles.sectionTitle}>Today's Intake History</Text>
        {logs.length === 0 ? (
          <View style={styles.emptyLogCard}>
            <Droplets size={28} color={theme.colors.textMuted} />
            <Text style={styles.emptyLogTitle}>No water logged yet today</Text>
            <Text style={styles.emptyLogSub}>Tap the quick add buttons above to track your hydration!</Text>
          </View>
        ) : (
          logs.map((log) => {
            const timeStr = new Date(log.logged_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logLeft}>
                  <View style={styles.logIconBox}>
                    <Droplets size={16} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.logAmount}>+{log.amount_ml} ml</Text>
                    <Text style={styles.logTime}>{timeStr}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.logDeleteBtn}
                  onPress={() => handleDeleteLog(log)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
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
  heroCard: {
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIntakeVal: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroIntakeUnit: {
    fontSize: 20,
    fontWeight: '600',
  },
  heroGoalSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  liquidBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 10,
  },
  liquidBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
  },
  remainingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  goalAchievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginTop: 4,
  },
  goalAchievedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickAddBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quickAddAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 6,
  },
  quickAddSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconTag: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  switchSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  timeSettingsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  timeSettingItem: {
    flex: 1,
  },
  settingInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  settingInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  saveSettingsBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  saveSettingsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyLogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  emptyLogTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
  },
  emptyLogSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  logCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  logTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  logDeleteBtn: {
    padding: 6,
  },
});
