import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession, FocusSessionStatus, ActiveFocusState } from '@/types';

const ACTIVE_FOCUS_SESSION_KEY = '@smart_study_active_focus_session';
const INTENTIONAL_NAV_KEY = '@smart_study_intentional_nav';

// Cross-platform storage helper
async function setStorageItem(key: string, value: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    await AsyncStorage.setItem(key, value);
  } catch (err) {
    console.warn('Error writing to storage:', err);
  }
}

async function getStorageItem(key: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
    return await AsyncStorage.getItem(key);
  } catch (err) {
    console.warn('Error reading from storage:', err);
    return null;
  }
}

async function removeStorageItem(key: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn('Error removing from storage:', err);
  }
}

/**
 * Save active focus session state locally (timestamp-based)
 */
export async function saveActiveSessionLocal(state: ActiveFocusState): Promise<void> {
  await setStorageItem(ACTIVE_FOCUS_SESSION_KEY, JSON.stringify(state));
}

/**
 * Retrieve active focus session state from local storage
 */
export async function getActiveSessionLocal(): Promise<ActiveFocusState | null> {
  try {
    const raw = await getStorageItem(ACTIVE_FOCUS_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveFocusState;
  } catch {
    return null;
  }
}

/**
 * Clear active focus session from local storage
 */
export async function clearActiveSessionLocal(): Promise<void> {
  await removeStorageItem(ACTIVE_FOCUS_SESSION_KEY);
}

/**
 * Mark whether user is navigating intentionally to a study resource (PDF or YouTube)
 */
export async function setIntentionalNavigationFlag(isIntentional: boolean): Promise<void> {
  await setStorageItem(INTENTIONAL_NAV_KEY, isIntentional ? 'true' : 'false');
}

/**
 * Check if the user navigated intentionally
 */
export async function getIntentionalNavigationFlag(): Promise<boolean> {
  const val = await getStorageItem(INTENTIONAL_NAV_KEY);
  return val === 'true';
}

/**
 * Start and record a new focus session in Supabase
 */
export async function startFocusSession(params: {
  plannedMinutes: number;
  subjectId?: string;
  unitId?: string;
  studentId?: string;
}): Promise<{ session: FocusSession | null; error?: string }> {
  try {
    let uid = params.studentId;
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }

    if (!uid) {
      return { session: null, error: 'User not authenticated' };
    }

    const newRecord = {
      student_id: uid,
      subject_id: params.subjectId || null,
      unit_id: params.unitId || null,
      planned_duration_minutes: params.plannedMinutes,
      actual_duration_seconds: 0,
      status: 'active' as FocusSessionStatus,
      started_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('focus_sessions')
      .insert(newRecord)
      .select()
      .single();

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache')
      ) {
        console.warn('focus_sessions table not created yet in Supabase. Falling back to client session.');
        // Return a mock local session object so focus mode works even before SQL migration
        const fallbackSession: FocusSession = {
          id: `local-${Date.now()}`,
          student_id: uid,
          subject_id: params.subjectId || null,
          unit_id: params.unitId || null,
          planned_duration_minutes: params.plannedMinutes,
          actual_duration_seconds: 0,
          status: 'active',
          started_at: newRecord.started_at,
        };
        return { session: fallbackSession };
      }
      return { session: null, error: error.message };
    }

    return { session: data };
  } catch (err: any) {
    console.error('startFocusSession exception:', err);
    return { session: null, error: err.message || 'Failed to start session' };
  }
}

/**
 * Update the state/status of a focus session (completed, emergency_ended, manually_ended, paused)
 */
export async function updateFocusSessionStatus(
  sessionId: string,
  status: FocusSessionStatus,
  actualDurationSeconds: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!sessionId || sessionId.startsWith('local-')) {
      // Local session only
      return { success: true };
    }

    const { error } = await supabase
      .from('focus_sessions')
      .update({
        status,
        actual_duration_seconds: actualDurationSeconds,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache')
      ) {
        return { success: true };
      }
      console.error('updateFocusSessionStatus error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('updateFocusSessionStatus exception:', err);
    return { success: false, error: err.message || 'Failed to update session' };
  }
}

/**
 * Fetch focus session history for the student
 */
export async function getStudentFocusHistory(studentId?: string): Promise<{
  sessions: FocusSession[];
  totalCompletedMinutes: number;
  totalCompletedSessions: number;
  totalElapsedMinutes: number;
}> {
  try {
    let uid = studentId;
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }

    const emptyResult = {
      sessions: [],
      totalCompletedMinutes: 0,
      totalCompletedSessions: 0,
      totalElapsedMinutes: 0,
    };

    if (!uid) return emptyResult;

    const { data, error } = await supabase
      .from('focus_sessions')
      .select(`
        id,
        student_id,
        subject_id,
        unit_id,
        planned_duration_minutes,
        actual_duration_seconds,
        status,
        started_at,
        ended_at,
        created_at,
        subjects (
          id,
          subject_code,
          subject_name
        ),
        units (
          id,
          unit_number,
          title,
          unit_title
        )
      `)
      .eq('student_id', uid)
      .order('started_at', { ascending: false });

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache')
      ) {
        console.warn('focus_sessions table not found in Supabase schema.');
        return emptyResult;
      }
      console.error('getStudentFocusHistory error:', error);
      return emptyResult;
    }

    const sessions: FocusSession[] = (data || []).map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      subject_id: row.subject_id,
      unit_id: row.unit_id,
      planned_duration_minutes: row.planned_duration_minutes,
      actual_duration_seconds: row.actual_duration_seconds || 0,
      status: row.status,
      started_at: row.started_at,
      ended_at: row.ended_at,
      created_at: row.created_at,
      subject: row.subjects ? {
        id: row.subjects.id,
        subject_code: row.subjects.subject_code,
        subject_name: row.subjects.subject_name,
      } : undefined,
      unit: row.units ? {
        id: row.units.id,
        unit_number: row.units.unit_number,
        title: row.units.unit_title || row.units.title || `Unit ${row.units.unit_number}`,
      } : undefined,
    }));

    let totalCompletedMins = 0;
    let totalCompletedCount = 0;
    let totalElapsedSecs = 0;

    sessions.forEach((s) => {
      totalElapsedSecs += s.actual_duration_seconds;
      if (s.status === 'completed') {
        totalCompletedCount += 1;
        totalCompletedMins += Math.round(s.actual_duration_seconds / 60);
      }
    });

    const totalElapsedMins = Math.round(totalElapsedSecs / 60);

    return {
      sessions,
      totalCompletedMinutes: totalCompletedMins,
      totalCompletedSessions: totalCompletedCount,
      totalElapsedMinutes: totalElapsedMins,
    };
  } catch (err) {
    console.error('getStudentFocusHistory exception:', err);
    return {
      sessions: [],
      totalCompletedMinutes: 0,
      totalCompletedSessions: 0,
      totalElapsedMinutes: 0,
    };
  }
}
