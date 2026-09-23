import { Platform, Vibration, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StudyTask, Exam, StudentNotificationSettings } from '@/types';

// Conditionally load expo-notifications (supported in Development Builds and standalone APKs)
let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch (_err) {
    // Silently fallback on Expo Go (SDK 53+ development builds are recommended for native push)
    Notifications = null;
  }
}

const STORAGE_KEYS = {
  HYDRATION_NOTIF_IDS: '@smart_study_hydration_notif_ids',
  EXAM_NOTIF_IDS: '@smart_study_exam_notif_ids',
  TASK_NOTIF_MAP: '@smart_study_task_notif_map',
  CUSTOM_REMINDERS: '@smart_study_custom_timed_reminders',
};

export interface CustomTimedReminder {
  id: string;
  title: string;
  body: string;
  scheduled_date: string;
  scheduled_time: string;
  created_at: string;
  type: 'custom' | 'study_alarm' | 'assignment' | 'exam';
}

/**
 * Configure global notification behavior when received in foreground
 */
export function setupNotificationHandler() {
  if (!Notifications || Platform.OS === 'web') return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (_err) {
    // Ignore in Expo Go
  }
}

/**
 * Request notification permissions and configure Android Notification Channels
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications || Platform.OS === 'web') return true;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Set up Android notification channels (Android 8.0+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('study-reminders', {
        name: 'Study Planner Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('hydration-reminders', {
        name: 'Water Hydration Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#3B82F6',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('exam-reminders', {
        name: 'Exam Alerts & Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#EF4444',
        sound: 'default',
      });
    }

    return true;
  } catch (err) {
    console.error('Error requesting notification permissions:', err);
    return false;
  }
}

/**
 * Schedule a local notification for an upcoming study task
 */
export async function scheduleTaskReminder(task: StudyTask): Promise<string | null> {
  if (!Notifications || Platform.OS === 'web' || !task.reminder_enabled) {
    return null;
  }

  try {
    // Parse study date and start time (format: YYYY-MM-DD and HH:MM or HH:MM:SS)
    const [year, month, day] = task.study_date.split('-').map(Number);
    const [hours, minutes] = task.start_time.split(':').map(Number);

    const taskStartTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const reminderTimeMs =
      taskStartTime.getTime() - (task.reminder_minutes_before || 10) * 60 * 1000;
    const triggerDate = new Date(reminderTimeMs);

    // Don't schedule for past times
    if (triggerDate.getTime() <= Date.now()) {
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📚 Study Reminder: ${task.title}`,
        body: `Starts in ${task.reminder_minutes_before || 10} minutes (${task.start_time.substring(0, 5)}). Time to focus!`,
        data: { taskId: task.id, type: 'study_task' },
        sound: 'default',
        channelId: 'study-reminders',
      },
      trigger: {
        type: 'date',
        date: triggerDate,
      },
    });

    return notifId;
  } catch (err) {
    console.error('Error scheduling task reminder:', err);
    return null;
  }
}

/**
 * Cancel a specific scheduled notification by ID
 */
export async function cancelNotification(notificationId?: string | null): Promise<void> {
  if (!Notifications || !notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('Could not cancel notification:', err);
  }
}

/**
 * Schedule rolling 45-minute hydration reminders within user's active window
 */
export async function scheduleHydrationReminders(
  settings: StudentNotificationSettings
): Promise<void> {
  if (!Notifications || Platform.OS === 'web') return;

  try {
    // 1. Cancel previously scheduled hydration notifications
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEYS.HYDRATION_NOTIF_IDS);
    if (existingRaw) {
      const existingIds: string[] = JSON.parse(existingRaw);
      await Promise.all(
        existingIds.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
        )
      );
      await AsyncStorage.removeItem(STORAGE_KEYS.HYDRATION_NOTIF_IDS);
    }

    // If disabled, stop here
    if (!settings.hydration_enabled) {
      return;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const intervalMinutes = settings.hydration_interval_minutes || 45;
    const [startH, startM] = (settings.hydration_start_time || '08:00').split(':').map(Number);
    const [endH, endM] = (settings.hydration_end_time || '22:00').split(':').map(Number);

    const now = new Date();
    const scheduledIds: string[] = [];

    // Schedule rolling reminders for today and tomorrow (max 30 notifications to respect OS limits)
    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      const targetDay = new Date();
      targetDay.setDate(now.getDate() + dayOffset);

      const dayStart = new Date(
        targetDay.getFullYear(),
        targetDay.getMonth(),
        targetDay.getDate(),
        startH,
        startM || 0,
        0
      );

      const dayEnd = new Date(
        targetDay.getFullYear(),
        targetDay.getMonth(),
        targetDay.getDate(),
        endH,
        endM || 0,
        0
      );

      let slot = new Date(dayStart.getTime());

      while (slot.getTime() <= dayEnd.getTime()) {
        if (slot.getTime() > now.getTime() + 60 * 1000) {
          // In the future
          const notifId = await Notifications.scheduleNotificationAsync({
            content: {
              title: '💧 Time for a Water Break!',
              body: 'Take a quick sip to stay hydrated and keep your mind sharp.',
              data: { type: 'hydration' },
              sound: 'default',
              channelId: 'hydration-reminders',
            },
            trigger: {
              type: 'date',
              date: slot,
            },
          });

          scheduledIds.push(notifId);

          if (scheduledIds.length >= 30) break;
        }

        slot = new Date(slot.getTime() + intervalMinutes * 60 * 1000);
      }

      if (scheduledIds.length >= 30) break;
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.HYDRATION_NOTIF_IDS,
      JSON.stringify(scheduledIds)
    );
  } catch (err) {
    console.error('Error scheduling hydration reminders:', err);
  }
}

/**
 * Calculate and synchronize automatic exam reminders (7 days, 3 days, 1 day before)
 */
export async function syncExamReminders(
  exams: Exam[],
  enabled: boolean = true
): Promise<void> {
  if (!Notifications || Platform.OS === 'web') return;

  try {
    // 1. Cancel previous exam notifications
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEYS.EXAM_NOTIF_IDS);
    if (existingRaw) {
      const existingIds: string[] = JSON.parse(existingRaw);
      await Promise.all(
        existingIds.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
        )
      );
      await AsyncStorage.removeItem(STORAGE_KEYS.EXAM_NOTIF_IDS);
    }

    if (!enabled || exams.length === 0) {
      return;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const scheduledIds: string[] = [];
    const now = new Date();

    for (const exam of exams) {
      const [year, month, day] = exam.exam_date.split('-').map(Number);
      const examDate = new Date(year, month - 1, day);

      const subjectName = exam.subject?.subject_name || 'Subject';
      const examTitle = exam.exam_title || 'Final Exam';

      // Reminder intervals: [daysBefore, title, body]
      const reminderConfigs = [
        {
          days: 7,
          title: `📅 Exam in 7 Days: ${subjectName}`,
          body: `${examTitle} is scheduled on ${exam.exam_date}. Review your syllabus and plan your revision!`,
        },
        {
          days: 3,
          title: `⏳ Exam in 3 Days: ${subjectName}`,
          body: `${examTitle} is in 3 days. Focus on previous question papers and key units!`,
        },
        {
          days: 1,
          title: `⚠️ Exam Tomorrow: ${subjectName}`,
          body: `${examTitle} takes place tomorrow${exam.exam_time ? ` at ${exam.exam_time.substring(0, 5)}` : ''}. Review your summary sheets and get good rest!`,
        },
      ];

      for (const config of reminderConfigs) {
        // Calculate reminder date at 08:30 AM local time
        const reminderDate = new Date(
          examDate.getFullYear(),
          examDate.getMonth(),
          examDate.getDate() - config.days,
          8,
          30,
          0,
          0
        );

        if (reminderDate.getTime() > now.getTime()) {
          const notifId = await Notifications.scheduleNotificationAsync({
            content: {
              title: config.title,
              body: config.body,
              data: { examId: exam.id, type: 'exam_reminder', daysBefore: config.days },
              sound: 'default',
              channelId: 'exam-reminders',
            },
            trigger: {
              type: 'date',
              date: reminderDate,
            },
          });

          scheduledIds.push(notifId);
        }
      }
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.EXAM_NOTIF_IDS,
      JSON.stringify(scheduledIds)
    );
  } catch (err) {
    console.error('Error synchronizing exam reminders:', err);
  }
}

/**
  * Schedule a custom user-defined notification with explicit date & time
  */
export async function scheduleCustomTimedNotification(params: {
  title: string;
  body?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type?: 'custom' | 'study_alarm' | 'assignment' | 'exam';
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!Notifications || Platform.OS === 'web') {
    return { success: false, error: 'Phone notifications are only supported on mobile devices.' };
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return { success: false, error: 'Notification permissions were denied. Please enable notifications in device settings.' };
    }

    const [year, month, day] = params.date.split('-').map(Number);
    const [hours, minutes] = params.time.split(':').map(Number);
    const triggerDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

    if (triggerDate.getTime() <= Date.now()) {
      return { success: false, error: 'The selected time has already passed. Please choose a future time.' };
    }

    let notifId = `reminder_${Date.now()}`;
    if (Notifications) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ ${params.title}`,
            body: params.body || `It's time for your scheduled study session (${params.time}). Open Smart Study to begin!`,
            data: { type: params.type || 'custom', scheduledTime: params.time },
            sound: 'default',
            channelId: 'study-reminders',
          },
          trigger: {
            type: 'date',
            date: triggerDate,
          },
        });
        if (id) notifId = id;
      } catch (_err) {
        // Fallback to local storage scheduling
      }
    }

    // Save reminder in local storage
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_REMINDERS);
    const list: CustomTimedReminder[] = existingRaw ? JSON.parse(existingRaw) : [];
    const newEntry: CustomTimedReminder = {
      id: notifId,
      title: params.title,
      body: params.body || `Scheduled for ${params.time}`,
      scheduled_date: params.date,
      scheduled_time: params.time,
      created_at: new Date().toISOString(),
      type: params.type || 'custom',
    };
    list.unshift(newEntry);
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_REMINDERS, JSON.stringify(list));

    return { success: true, id: notifId };
  } catch (err: any) {
    console.error('Error scheduling custom timed notification:', err);
    return { success: false, error: err.message || 'Failed to schedule notification.' };
  }
}

/**
  * Retrieve all active custom timed reminders from local storage
  */
export async function getCustomTimedReminders(): Promise<CustomTimedReminder[]> {
  if (Platform.OS === 'web') return [];
  try {
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_REMINDERS);
    if (!existingRaw) return [];
    return JSON.parse(existingRaw);
  } catch (err) {
    console.warn('Error fetching custom timed reminders:', err);
    return [];
  }
}

/**
  * Delete a specific custom timed reminder
  */
export async function deleteCustomTimedReminder(notificationId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (Notifications) {
      await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
    }
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_REMINDERS);
    if (existingRaw) {
      const list: CustomTimedReminder[] = JSON.parse(existingRaw);
      const updated = list.filter((r) => r.id !== notificationId);
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_REMINDERS, JSON.stringify(updated));
    }
    return true;
  } catch (err) {
    console.warn('Error deleting custom reminder:', err);
    return false;
  }
}

/**
  * Send an immediate test notification to verify device sound and banner
  */
export async function sendInstantTestNotification(
  title: string = '🔔 Smart Study Notification Test',
  body: string = 'Push notifications and timed alerts are active on your device!'
): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Phone notifications are only supported on mobile devices.' };
  }

  try {
    // Vibrate device to confirm haptic hardware
    try {
      Vibration.vibrate([0, 350, 150, 350]);
    } catch (_vErr) {}

    if (Notifications) {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: 'default',
            channelId: 'study-reminders',
          },
          trigger: null,
        });
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error sending test notification:', err);
    return { success: false, error: err.message || 'Failed to send test notification.' };
  }
}
