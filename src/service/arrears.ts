import { supabase } from '@/lib/supabase';
import type { Subject, ArrearStatus } from '@/types';

export interface ArrearSubjectItem {
  id: string; // subject id
  subject_code: string;
  subject_name: string;
  semester: number;
  department: string;
  credits: number;
  description: string | null;
  status?: ArrearStatus;
  passed_at?: string | null;
  units_count?: number;
  materials_count?: number;
  videos_count?: number;
}

/**
 * Fetch student arrear subjects with optional status filter ('active' | 'passed' | 'all')
 */
export async function getStudentArrearSubjects(
  studentId?: string,
  statusFilter: 'active' | 'passed' | 'all' = 'all'
): Promise<ArrearSubjectItem[]> {
  try {
    let targetStudentId = studentId;
    if (!targetStudentId) {
      const { data: userData } = await supabase.auth.getUser();
      targetStudentId = userData?.user?.id;
    }
    if (!targetStudentId) return [];

    let query = supabase
      .from('student_subjects')
      .select(`
        subject_id,
        type,
        status,
        passed_at,
        subjects:subjects (
          id,
          subject_code,
          subject_name,
          semester,
          department,
          credits,
          description
        )
      `)
      .eq('student_id', targetStudentId)
      .eq('type', 'arrear');

    const { data, error } = await query;

    if (error) {
      // Fallback if status or passed_at column is not present yet in schema cache
      if (error.message?.includes('status') || error.message?.includes('passed_at') || error.code === 'PGRST204') {
        const fallbackRes = await supabase
          .from('student_subjects')
          .select(`
            subject_id,
            type,
            subjects:subjects (
              id,
              subject_code,
              subject_name,
              semester,
              department,
              credits,
              description
            )
          `)
          .eq('student_id', targetStudentId)
          .eq('type', 'arrear');

        if (fallbackRes.error) {
          console.warn('Error fetching student arrear subjects fallback:', fallbackRes.error);
          return [];
        }

        const items = (fallbackRes.data || [])
          .map((item: any) => item.subjects)
          .filter(Boolean)
          .map((s: any) => ({
            id: s.id,
            subject_code: s.subject_code,
            subject_name: s.subject_name,
            semester: s.semester,
            department: s.department,
            credits: s.credits,
            description: s.description,
            status: 'active' as ArrearStatus,
            passed_at: null,
          }));

        return items;
      }

      console.warn('Error fetching student arrear subjects:', error);
      return [];
    }

    const items: ArrearSubjectItem[] = (data || [])
      .filter((row: any) => row.subjects !== null && row.subjects !== undefined)
      .map((row: any) => {
        const s = row.subjects;
        const rowStatus: ArrearStatus = row.status === 'passed' ? 'passed' : 'active';
        return {
          id: s.id,
          subject_code: s.subject_code,
          subject_name: s.subject_name,
          semester: s.semester,
          department: s.department,
          credits: s.credits,
          description: s.description,
          status: rowStatus,
          passed_at: row.passed_at || null,
        };
      });

    // Deduplicate by id
    const uniqueMap = new Map<string, ArrearSubjectItem>();
    items.forEach((item) => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    let result = Array.from(uniqueMap.values());

    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }

    result.sort((a, b) => a.semester - b.semester || a.subject_name.localeCompare(b.subject_name));
    return result;
  } catch (err) {
    console.warn('Unexpected error in getStudentArrearSubjects:', err);
    return [];
  }
}

export async function getEligibleArrearSubjects(options?: {
  maxSemester?: number;
  department?: string;
}): Promise<ArrearSubjectItem[]> {
  try {
    let query = supabase
      .from('subjects')
      .select('*')
      .order('semester', { ascending: true })
      .order('subject_name', { ascending: true });

    if (options?.maxSemester !== undefined) {
      query = query.lt('semester', options.maxSemester);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error fetching eligible subjects:', error);
      return [];
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      subject_code: s.subject_code,
      subject_name: s.subject_name,
      semester: s.semester,
      department: s.department,
      credits: s.credits,
      description: s.description,
      status: 'active' as ArrearStatus,
    }));
  } catch (err) {
    console.warn('Unexpected error in getEligibleArrearSubjects:', err);
    return [];
  }
}

export async function addArrearSubjects(
  subjectIds: string[],
  studentId?: string
): Promise<boolean> {
  let targetStudentId = studentId;
  if (!targetStudentId) {
    const { data: userData } = await supabase.auth.getUser();
    targetStudentId = userData?.user?.id;
  }
  if (!targetStudentId || subjectIds.length === 0) return false;

  const records = subjectIds.map((sId) => ({
    student_id: targetStudentId,
    subject_id: sId,
    type: 'arrear',
    status: 'active',
  }));

  const { error } = await supabase
    .from('student_subjects')
    .upsert(records, {
      onConflict: 'student_id,subject_id',
      ignoreDuplicates: true,
    });

  if (error) {
    // If status column is not supported, retry without status field
    if (error.message?.includes('status')) {
      const fallbackRecords = subjectIds.map((sId) => ({
        student_id: targetStudentId,
        subject_id: sId,
        type: 'arrear',
      }));
      const fallbackRes = await supabase
        .from('student_subjects')
        .upsert(fallbackRecords, {
          onConflict: 'student_id,subject_id',
          ignoreDuplicates: true,
        });
      if (fallbackRes.error) {
        console.error('Error adding arrear subjects fallback:', fallbackRes.error);
        throw fallbackRes.error;
      }
      return true;
    }
    console.error('Error adding arrear subjects:', error);
    throw error;
  }

  return true;
}

export async function removeArrearSubject(
  subjectId: string,
  studentId?: string
): Promise<boolean> {
  let targetStudentId = studentId;
  if (!targetStudentId) {
    const { data: userData } = await supabase.auth.getUser();
    targetStudentId = userData?.user?.id;
  }
  if (!targetStudentId || !subjectId) return false;

  const { error } = await supabase
    .from('student_subjects')
    .delete()
    .eq('student_id', targetStudentId)
    .eq('subject_id', subjectId)
    .eq('type', 'arrear');

  if (error) {
    console.error('Error removing arrear subject:', error);
    throw error;
  }

  return true;
}

/**
 * Mark an arrear subject as Passed
 */
export async function markArrearPassed(
  subjectId: string,
  studentId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let targetStudentId = studentId;
    if (!targetStudentId) {
      const { data: userData } = await supabase.auth.getUser();
      targetStudentId = userData?.user?.id;
    }
    if (!targetStudentId || !subjectId) {
      return { success: false, error: 'Student ID and Subject ID are required' };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('student_subjects')
      .update({
        status: 'passed',
        passed_at: now,
      })
      .eq('student_id', targetStudentId)
      .eq('subject_id', subjectId)
      .eq('type', 'arrear');

    if (error) {
      console.warn('Error marking arrear as passed in Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('markArrearPassed exception:', err);
    return { success: false, error: err.message || 'Failed to update arrear status' };
  }
}

/**
 * Mark an arrear subject as Active (e.g. undo passed status)
 */
export async function markArrearActive(
  subjectId: string,
  studentId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let targetStudentId = studentId;
    if (!targetStudentId) {
      const { data: userData } = await supabase.auth.getUser();
      targetStudentId = userData?.user?.id;
    }
    if (!targetStudentId || !subjectId) {
      return { success: false, error: 'Student ID and Subject ID are required' };
    }

    const { error } = await supabase
      .from('student_subjects')
      .update({
        status: 'active',
        passed_at: null,
      })
      .eq('student_id', targetStudentId)
      .eq('subject_id', subjectId)
      .eq('type', 'arrear');

    if (error) {
      console.warn('Error marking arrear as active in Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('markArrearActive exception:', err);
    return { success: false, error: err.message || 'Failed to update arrear status' };
  }
}

/**
 * Check if a given subject is marked as an arrear for the student
 */
export async function isArrearSubject(
  subjectId: string,
  studentId?: string
): Promise<boolean> {
  const statusInfo = await getArrearSubjectStatus(subjectId, studentId);
  return statusInfo.isArrear;
}

/**
 * Get the detailed arrear status of a subject for the student
 */
export async function getArrearSubjectStatus(
  subjectId: string,
  studentId?: string
): Promise<{ isArrear: boolean; status?: ArrearStatus; passed_at?: string | null }> {
  try {
    let targetStudentId = studentId;
    if (!targetStudentId) {
      const { data: userData } = await supabase.auth.getUser();
      targetStudentId = userData?.user?.id;
    }
    if (!targetStudentId || !subjectId) return { isArrear: false };

    const { data, error } = await supabase
      .from('student_subjects')
      .select('id, status, passed_at')
      .eq('student_id', targetStudentId)
      .eq('subject_id', subjectId)
      .eq('type', 'arrear')
      .maybeSingle();

    if (error || !data) return { isArrear: false };

    const status: ArrearStatus = data.status === 'passed' ? 'passed' : 'active';
    return {
      isArrear: true,
      status,
      passed_at: data.passed_at || null,
    };
  } catch {
    return { isArrear: false };
  }
}
