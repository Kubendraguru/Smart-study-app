import { supabase } from '@/lib/supabase';
import type { Assignment } from '@/types';

export async function getAssignments(options?: {
  subjectId?: string;
  unitId?: string;
  teacherId?: string;
}): Promise<Assignment[]> {
  try {
    let query = supabase
      .from('assignments')
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name),
        unit:units(id, unit_number, unit_title)
      `)
      .order('due_date', { ascending: true });

    const isUuid = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    if (options?.subjectId) {
      if (!isUuid(options.subjectId)) return [];
      query = query.eq('subject_id', options.subjectId);
    }
    if (options?.unitId) {
      if (!isUuid(options.unitId)) return [];
      query = query.eq('unit_id', options.unitId);
    }
    if (options?.teacherId) {
      if (!isUuid(options.teacherId)) return [];
      query = query.eq('teacher_id', options.teacherId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error fetching assignments:', error);
      return [];
    }

    return (data || []).map((a: any) => ({
      id: a.id,
      teacher_id: a.teacher_id,
      subject_id: a.subject_id,
      unit_id: a.unit_id,
      title: a.title,
      description: a.description,
      due_date: a.due_date,
      due_time: a.due_time,
      max_marks: a.max_marks || 100,
      attachment_url: a.attachment_url,
      created_at: a.created_at,
      updated_at: a.updated_at,
      subject: a.subject || undefined,
      unit: a.unit || undefined,
    }));
  } catch (err) {
    console.warn('Unexpected error in getAssignments:', err);
    return [];
  }
}

export async function createAssignment(params: {
  subjectId: string;
  unitId?: string | null;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  maxMarks?: number;
  attachmentUrl?: string;
}): Promise<Assignment> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('You must be logged in as an instructor to create assignments.');
  }

  const payload: any = {
    teacher_id: userData.user.id,
    subject_id: params.subjectId,
    title: params.title.trim(),
    description: params.description?.trim() || null,
    due_date: params.dueDate,
    due_time: params.dueTime?.trim() || null,
    max_marks: Number(params.maxMarks) || 100,
    attachment_url: params.attachmentUrl?.trim() || null,
  };

  if (params.unitId) {
    payload.unit_id = params.unitId;
  }

  const { data, error } = await supabase
    .from('assignments')
    .insert(payload)
    .select(`
      *,
      subject:subjects(id, subject_code, subject_name),
      unit:units(id, unit_number, unit_title)
    `)
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }

  return {
    id: data.id,
    teacher_id: data.teacher_id,
    subject_id: data.subject_id,
    unit_id: data.unit_id,
    title: data.title,
    description: data.description,
    due_date: data.due_date,
    due_time: data.due_time,
    max_marks: data.max_marks,
    attachment_url: data.attachment_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
    subject: data.subject || undefined,
    unit: data.unit || undefined,
  };
}

export async function updateAssignment(
  id: string,
  params: Partial<{
    title: string;
    description: string;
    dueDate: string;
    dueTime: string;
    maxMarks: number;
    attachmentUrl: string;
    unitId: string | null;
  }>
): Promise<Assignment> {
  const payload: any = {};
  if (params.title !== undefined) payload.title = params.title.trim();
  if (params.description !== undefined) payload.description = params.description.trim();
  if (params.dueDate !== undefined) payload.due_date = params.dueDate;
  if (params.dueTime !== undefined) payload.due_time = params.dueTime;
  if (params.maxMarks !== undefined) payload.max_marks = Number(params.maxMarks);
  if (params.attachmentUrl !== undefined) payload.attachment_url = params.attachmentUrl;
  if (params.unitId !== undefined) payload.unit_id = params.unitId;

  const { data, error } = await supabase
    .from('assignments')
    .update(payload)
    .eq('id', id)
    .select(`
      *,
      subject:subjects(id, subject_code, subject_name),
      unit:units(id, unit_number, unit_title)
    `)
    .single();

  if (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }

  return {
    id: data.id,
    teacher_id: data.teacher_id,
    subject_id: data.subject_id,
    unit_id: data.unit_id,
    title: data.title,
    description: data.description,
    due_date: data.due_date,
    due_time: data.due_time,
    max_marks: data.max_marks,
    attachment_url: data.attachment_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
    subject: data.subject || undefined,
    unit: data.unit || undefined,
  };
}

export async function deleteAssignment(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }

  return true;
}

export async function getStudentAssignments(studentId?: string): Promise<Assignment[]> {
  try {
    let targetStudentId = studentId;
    if (!targetStudentId) {
      const { data: userData } = await supabase.auth.getUser();
      targetStudentId = userData?.user?.id;
    }

    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        subject:subjects(id, subject_code, subject_name),
        unit:units(id, unit_number, unit_title)
      `)
      .order('due_date', { ascending: true });

    if (error) {
      console.warn('Error fetching student assignments:', error);
      return [];
    }

    return (data || []).map((a: any) => ({
      id: a.id,
      teacher_id: a.teacher_id,
      subject_id: a.subject_id,
      unit_id: a.unit_id,
      title: a.title,
      description: a.description,
      due_date: a.due_date,
      due_time: a.due_time,
      max_marks: a.max_marks || 100,
      attachment_url: a.attachment_url,
      created_at: a.created_at,
      updated_at: a.updated_at,
      subject: a.subject || undefined,
      unit: a.unit || undefined,
    }));
  } catch (err) {
    console.warn('Unexpected error in getStudentAssignments:', err);
    return [];
  }
}

