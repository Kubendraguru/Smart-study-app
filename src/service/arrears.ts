import { supabase } from '@/lib/supabase';
import type { Subject } from '@/types';

export interface ArrearSubjectItem {
  id: string; // subject id
  subject_code: string;
  subject_name: string;
  semester: number;
  department: string;
  credits: number;
  description: string | null;
  units_count?: number;
  materials_count?: number;
  videos_count?: number;
}

export async function getStudentArrearSubjects(
  studentId?: string
): Promise<ArrearSubjectItem[]> {
  try {
    let targetStudentId = studentId;
    if (!targetStudentId) {
      const { data: userData } = await supabase.auth.getUser();
      targetStudentId = userData?.user?.id;
    }
    if (!targetStudentId) return [];

    const { data, error } = await supabase
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

    if (error) {
      console.warn('Error fetching student arrear subjects:', error);
      return [];
    }

    const rawSubjects = (data || [])
      .map((item: any) => item.subjects)
      .filter((s: any) => s !== null && s !== undefined);

    // Deduplicate by id
    const uniqueMap = new Map<string, ArrearSubjectItem>();
    rawSubjects.forEach((s: any) => {
      if (!uniqueMap.has(s.id)) {
        uniqueMap.set(s.id, {
          id: s.id,
          subject_code: s.subject_code,
          subject_name: s.subject_name,
          semester: s.semester,
          department: s.department,
          credits: s.credits,
          description: s.description,
        });
      }
    });

    const result = Array.from(uniqueMap.values());
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
  }));

  const { error } = await supabase
    .from('student_subjects')
    .upsert(records, {
      onConflict: 'student_id,subject_id',
      ignoreDuplicates: true,
    });

  if (error) {
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

export async function isArrearSubject(
  subjectId: string,
  studentId?: string
): Promise<boolean> {
  let targetStudentId = studentId;
  if (!targetStudentId) {
    const { data: userData } = await supabase.auth.getUser();
    targetStudentId = userData?.user?.id;
  }
  if (!targetStudentId || !subjectId) return false;

  const { data, error } = await supabase
    .from('student_subjects')
    .select('id')
    .eq('student_id', targetStudentId)
    .eq('subject_id', subjectId)
    .eq('type', 'arrear')
    .maybeSingle();

  if (error || !data) return false;
  return true;
}
