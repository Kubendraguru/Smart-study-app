import { supabase } from '@/lib/supabase';
import type { HydrationLog, StudentNotificationSettings } from '@/types';
import { getLocalDateString } from './studyPlanner';
import { scheduleHydrationReminders } from './notifications';

const DEFAULT_SETTINGS: Omit<StudentNotificationSettings, 'student_id' | 'id'> = {
  hydration_enabled: false,
  hydration_interval_minutes: 45,
  hydration_start_time: '08:00',
  hydration_end_time: '22:00',
  hydration_daily_goal_ml: 2000,
  exam_reminders_enabled: true,
  study_task_reminders_enabled: true,
};

/**
 * Get total water intake and log entries for today
 */
export async function getTodayHydration(
  studentId: string,
  dateString: string = getLocalDateString()
): Promise<{ totalMl: number; logs: HydrationLog[] }> {
  try {
    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('log_date', dateString)
      .order('logged_at', { ascending: false });

    if (error) {
      console.warn('Error fetching hydration logs:', error.message);
      return { totalMl: 0, logs: [] };
    }

    const logs = data ?? [];
    const totalMl = logs.reduce((sum, item) => sum + (item.amount_ml || 0), 0);

    return { totalMl, logs };
  } catch (err) {
    console.error('Unexpected error in getTodayHydration:', err);
    return { totalMl: 0, logs: [] };
  }
}

/**
 * Record a water intake entry (e.g. +250ml or +500ml)
 */
export async function logWaterIntake(
  studentId: string,
  amountMl: number
): Promise<{ success: boolean; log?: HydrationLog; error?: string }> {
  if (amountMl <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  try {
    const today = getLocalDateString();
    const { data, error } = await supabase
      .from('hydration_logs')
      .insert([
        {
          student_id: studentId,
          amount_ml: amountMl,
          logged_at: new Date().toISOString(),
          log_date: today,
        },
      ])
      .select('*')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to log water' };
    }

    return { success: true, log: data };
  } catch (err: any) {
    console.error('Error in logWaterIntake:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Delete a water intake entry
 */
export async function deleteHydrationLog(
  logId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('hydration_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting hydration log:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch or initialize student notification & hydration preferences
 */
export async function getStudentNotificationSettings(
  studentId: string
): Promise<StudentNotificationSettings> {
  try {
    const { data, error } = await supabase
      .from('student_notification_settings')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (data) {
      return data;
    }

    // Insert default settings if not exists
    const { data: newSettings, error: insertErr } = await supabase
      .from('student_notification_settings')
      .insert([
        {
          student_id: studentId,
          ...DEFAULT_SETTINGS,
        },
      ])
      .select('*')
      .single();

    if (newSettings) {
      return newSettings;
    }

    return { student_id: studentId, ...DEFAULT_SETTINGS };
  } catch (err) {
    console.error('Error in getStudentNotificationSettings:', err);
    return { student_id: studentId, ...DEFAULT_SETTINGS };
  }
}

/**
 * Update student notification & hydration preferences and reschedule notifications
 */
export async function updateStudentNotificationSettings(
  studentId: string,
  updates: Partial<StudentNotificationSettings>
): Promise<{ success: boolean; settings?: StudentNotificationSettings; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('student_notification_settings')
      .upsert(
        {
          student_id: studentId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      )
      .select('*')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update settings' };
    }

    // Recalculate hydration reminders schedule
    await scheduleHydrationReminders(data);

    return { success: true, settings: data };
  } catch (err: any) {
    console.error('Error updating notification settings:', err);
    return { success: false, error: err?.message };
  }
}
