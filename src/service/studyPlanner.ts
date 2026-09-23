import { supabase } from '@/lib/supabase';
import type { StudyTask, StudyPlan, TaskPriority, TaskStatus } from '@/types';
import { scheduleTaskReminder, cancelNotification } from './notifications';

export interface CreateTaskInput {
  student_id: string;
  plan_id?: string | null;
  subject_id?: string | null;
  unit_id?: string | null;
  title: string;
  description?: string | null;
  study_date: string;
  start_time: string;
  end_time: string;
  priority?: TaskPriority;
  reminder_enabled?: boolean;
  reminder_minutes_before?: number;
  is_ai_generated?: boolean;
}

/**
 * Format a Date object to YYYY-MM-DD local calendar string
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Fetch all tasks scheduled for a specific date (e.g. today)
 */
export async function getDayTasks(
  studentId: string,
  dateString: string = getLocalDateString()
): Promise<StudyTask[]> {
  try {
    const { data, error } = await supabase
      .from('study_tasks')
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name),
        unit:units(id, unit_number, unit_title)
      `)
      .eq('student_id', studentId)
      .eq('study_date', dateString)
      .order('start_time', { ascending: true });

    if (error) {
      console.warn('Error fetching day tasks:', error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Unexpected error in getDayTasks:', err);
    return [];
  }
}

/**
 * Fetch all upcoming tasks starting from tomorrow
 */
export async function getUpcomingTasks(
  studentId: string,
  fromDateString: string = getLocalDateString()
): Promise<StudyTask[]> {
  try {
    const { data, error } = await supabase
      .from('study_tasks')
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name),
        unit:units(id, unit_number, unit_title)
      `)
      .eq('student_id', studentId)
      .gt('study_date', fromDateString)
      .order('study_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(50);

    if (error) {
      console.warn('Error fetching upcoming tasks:', error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Unexpected error in getUpcomingTasks:', err);
    return [];
  }
}

/**
 * Fetch all completed tasks
 */
export async function getCompletedTasks(studentId: string): Promise<StudyTask[]> {
  try {
    const { data, error } = await supabase
      .from('study_tasks')
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name),
        unit:units(id, unit_number, unit_title)
      `)
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('study_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Error fetching completed tasks:', error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Unexpected error in getCompletedTasks:', err);
    return [];
  }
}

/**
 * Calculate study progress stats for a specific day
 */
export async function getDailyStudyProgress(
  studentId: string,
  dateString: string = getLocalDateString()
): Promise<{ total: number; completed: number; pending: number; missed: number; percentage: number }> {
  try {
    const tasks = await getDayTasks(studentId, dateString);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const missed = tasks.filter((t) => t.status === 'missed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, missed, percentage };
  } catch (err) {
    console.error('Error calculating study progress:', err);
    return { total: 0, completed: 0, pending: 0, missed: 0, percentage: 0 };
  }
}

/**
 * Create a new study task and schedule its start-time notification
 */
export async function createStudyTask(
  input: CreateTaskInput
): Promise<{ success: boolean; task?: StudyTask; error?: string }> {
  try {
    const payload = {
      student_id: input.student_id,
      plan_id: input.plan_id || null,
      subject_id: input.subject_id || null,
      unit_id: input.unit_id || null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      study_date: input.study_date,
      start_time: input.start_time,
      end_time: input.end_time,
      priority: input.priority || 'medium',
      status: 'pending',
      reminder_enabled: input.reminder_enabled ?? true,
      reminder_minutes_before: input.reminder_minutes_before || 10,
      is_ai_generated: input.is_ai_generated || false,
    };

    const { data, error } = await supabase
      .from('study_tasks')
      .insert([payload])
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name),
        unit:units(id, unit_number, unit_title)
      `)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create task' };
    }

    // Schedule notification if reminder enabled
    if (data.reminder_enabled) {
      const notifId = await scheduleTaskReminder(data);
      if (notifId) {
        await supabase
          .from('study_tasks')
          .update({ notification_id: notifId })
          .eq('id', data.id);
        data.notification_id = notifId;
      }
    }

    return { success: true, task: data };
  } catch (err: any) {
    console.error('Error creating study task:', err);
    return { success: false, error: err?.message || 'Unexpected error' };
  }
}

/**
 * Update task details or toggle status (pending/completed/missed)
 */
export async function updateStudyTask(
  taskId: string,
  updates: Partial<StudyTask>
): Promise<{ success: boolean; task?: StudyTask; error?: string }> {
  try {
    // 1. Fetch current task to see if reminder needs rescheduling
    const { data: current } = await supabase
      .from('study_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    const { data, error } = await supabase
      .from('study_tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name),
        unit:units(id, unit_number, unit_title)
      `)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update task' };
    }

    // 2. Handle notification updates
    if (current?.notification_id) {
      await cancelNotification(current.notification_id);
    }

    if (data.status === 'pending' && data.reminder_enabled) {
      const newNotifId = await scheduleTaskReminder(data);
      if (newNotifId) {
        await supabase
          .from('study_tasks')
          .update({ notification_id: newNotifId })
          .eq('id', data.id);
        data.notification_id = newNotifId;
      }
    } else if (data.status !== 'pending') {
      // Clear notification_id if completed or missed
      await supabase
        .from('study_tasks')
        .update({ notification_id: null })
        .eq('id', data.id);
      data.notification_id = null;
    }

    return { success: true, task: data };
  } catch (err: any) {
    console.error('Error updating study task:', err);
    return { success: false, error: err?.message || 'Unexpected error' };
  }
}

/**
 * Delete a study task and cancel any pending notification
 */
export async function deleteStudyTask(
  taskId: string,
  notificationId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (notificationId) {
      await cancelNotification(notificationId);
    }

    const { error } = await supabase
      .from('study_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting study task:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch all saved AI study plans for the student
 */
export async function getSavedStudyPlans(studentId: string): Promise<StudyPlan[]> {
  try {
    const { data: plans, error } = await supabase
      .from('study_plans')
      .select('*, tasks:study_tasks(id, status)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching saved study plans:', error.message);
      return [];
    }

    return (plans ?? []).map((p: any) => {
      const tasks = p.tasks || [];
      const total_tasks_count = tasks.length;
      const completed_tasks_count = tasks.filter((t: any) => t.status === 'completed').length;

      return {
        ...p,
        total_tasks_count,
        completed_tasks_count,
      };
    });
  } catch (err) {
    console.error('Unexpected error in getSavedStudyPlans:', err);
    return [];
  }
}

/**
 * Fetch full study plan details with all associated tasks
 */
export async function getStudyPlanDetails(planId: string): Promise<StudyPlan | null> {
  try {
    const { data: plan, error: planErr } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planErr || !plan) {
      return null;
    }

    const { data: tasks } = await supabase
      .from('study_tasks')
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name),
        unit:units(id, unit_number, unit_title)
      `)
      .eq('plan_id', planId)
      .order('study_date', { ascending: true })
      .order('start_time', { ascending: true });

    const total_tasks_count = (tasks ?? []).length;
    const completed_tasks_count = (tasks ?? []).filter((t) => t.status === 'completed').length;

    return {
      ...plan,
      tasks: tasks ?? [],
      total_tasks_count,
      completed_tasks_count,
    };
  } catch (err) {
    console.error('Error getting study plan details:', err);
    return null;
  }
}

/**
 * Delete a saved study plan and all its tasks
 */
export async function deleteStudyPlan(planId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch tasks to cancel notifications
    const { data: tasks } = await supabase
      .from('study_tasks')
      .select('notification_id')
      .eq('plan_id', planId);

    if (tasks) {
      await Promise.all(
        tasks
          .filter((t) => t.notification_id)
          .map((t) => cancelNotification(t.notification_id))
      );
    }

    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting study plan:', err);
    return { success: false, error: err?.message };
  }
}
