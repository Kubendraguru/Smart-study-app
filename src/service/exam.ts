import { supabase } from '@/lib/supabase';
import type { Exam } from '@/types';
import { getLocalDateString } from './studyPlanner';
import { syncExamReminders } from './notifications';
import { getStudentNotificationSettings } from './hydration';

export interface CreateExamInput {
  subject_id: string;
  teacher_id: string;
  exam_title: string;
  exam_date: string; // YYYY-MM-DD
  exam_time?: string | null;
  location?: string | null;
  instructions?: string | null;
}

/**
 * Calculate difference in calendar days between today and target date
 */
export function calculateDaysRemaining(targetDateString: string): number {
  const [year, month, day] = targetDateString.split('-').map(Number);
  const examDate = new Date(year, month - 1, day, 0, 0, 0);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const diffMs = examDate.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format date string into readable English format (e.g. "Thu, 15 Oct 2026")
 */
export function formatExamDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Fetch all upcoming exams relevant to a student (current semester subjects + arrears)
 */
export async function getStudentUpcomingExams(studentId: string): Promise<Exam[]> {
  try {
    const todayStr = getLocalDateString();

    // 1. Get student profile for semester/department
    const { data: profile } = await supabase
      .from('profiles')
      .select('semester, department')
      .eq('id', studentId)
      .maybeSingle();

    const studentSemester = profile?.semester || 5;

    // 2. Get student arrear subject IDs
    const { data: arrears } = await supabase
      .from('student_subjects')
      .select('subject_id')
      .eq('student_id', studentId)
      .eq('type', 'arrear');

    const arrearSubjectIds = (arrears ?? []).map((a) => a.subject_id).filter(Boolean);

    // 3. Get all subjects in student's semester or arrears
    const { data: validSubjects } = await supabase
      .from('subjects')
      .select('id')
      .or(`semester.eq.${studentSemester},id.in.(${arrearSubjectIds.length > 0 ? arrearSubjectIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

    const validSubjectIds = (validSubjects ?? []).map((s) => s.id);

    // 4. Fetch exams on or after today
    let query = supabase
      .from('exams')
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name, semester, department)
      `)
      .gte('exam_date', todayStr)
      .order('exam_date', { ascending: true })
      .order('exam_time', { ascending: true });

    if (validSubjectIds.length > 0) {
      query = query.in('subject_id', validSubjectIds);
    }

    const { data: examsData, error } = await query;

    if (error) {
      console.warn('Error fetching student exams:', error.message);
      return [];
    }

    const exams: Exam[] = (examsData ?? []).map((e: any) => ({
      ...e,
      days_remaining: calculateDaysRemaining(e.exam_date),
      formatted_date: formatExamDate(e.exam_date),
    }));

    return exams;
  } catch (err) {
    console.error('Unexpected error in getStudentUpcomingExams:', err);
    return [];
  }
}

/**
 * Synchronize student's local exam reminders with Supabase
 */
export async function syncStudentExamNotifications(studentId: string): Promise<void> {
  try {
    const settings = await getStudentNotificationSettings(studentId);
    const exams = await getStudentUpcomingExams(studentId);
    await syncExamReminders(exams, settings.exam_reminders_enabled);
  } catch (err) {
    console.error('Error synchronizing student exam notifications:', err);
  }
}

/**
 * Fetch all exams created by a teacher (or all exams for teacher role)
 */
export async function getTeacherExams(teacherId: string): Promise<Exam[]> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name, semester, department)
      `)
      .order('exam_date', { ascending: true })
      .order('exam_time', { ascending: true });

    if (error) {
      console.warn('Error fetching teacher exams:', error.message);
      return [];
    }

    return (data ?? []).map((e: any) => ({
      ...e,
      days_remaining: calculateDaysRemaining(e.exam_date),
      formatted_date: formatExamDate(e.exam_date),
    }));
  } catch (err) {
    console.error('Unexpected error in getTeacherExams:', err);
    return [];
  }
}

/**
 * Create a new exam entry by a teacher
 */
export async function createExam(
  input: CreateExamInput
): Promise<{ success: boolean; exam?: Exam; error?: string }> {
  try {
    const payload = {
      subject_id: input.subject_id,
      teacher_id: input.teacher_id,
      exam_title: input.exam_title.trim(),
      exam_date: input.exam_date,
      exam_time: input.exam_time || null,
      location: input.location?.trim() || null,
      instructions: input.instructions?.trim() || null,
    };

    const { data, error } = await supabase
      .from('exams')
      .insert([payload])
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name, semester, department)
      `)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create exam' };
    }

    return {
      success: true,
      exam: {
        ...data,
        days_remaining: calculateDaysRemaining(data.exam_date),
        formatted_date: formatExamDate(data.exam_date),
      },
    };
  } catch (err: any) {
    console.error('Error creating exam:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Update an existing exam schedule
 */
export async function updateExam(
  examId: string,
  updates: Partial<CreateExamInput>
): Promise<{ success: boolean; exam?: Exam; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name, semester, department)
      `)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update exam' };
    }

    return {
      success: true,
      exam: {
        ...data,
        days_remaining: calculateDaysRemaining(data.exam_date),
        formatted_date: formatExamDate(data.exam_date),
      },
    };
  } catch (err: any) {
    console.error('Error updating exam:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Delete an exam
 */
export async function deleteExam(examId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('exams').delete().eq('id', examId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting exam:', err);
    return { success: false, error: err?.message };
  }
}
