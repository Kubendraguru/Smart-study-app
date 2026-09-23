import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types';
import { announcements as initialAnnouncements } from '@/data/announcements';

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        id,
        teacher_id,
        subject_id,
        title,
        message,
        priority,
        created_at,
        subjects (
          subject_name,
          subject_code
        ),
        profiles:teacher_id (
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not fetch announcements from Supabase, falling back to local data:', error.message);
      return initialAnnouncements;
    }

    if (!data || data.length === 0) {
      return initialAnnouncements;
    }

    return data.map((item: any) => {
      const subjectName = item.subjects?.subject_name || 'General';
      const teacherName = item.profiles?.full_name || 'Faculty Member';
      const createdDate = item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : 'Today';

      return {
        id: item.id,
        teacher_id: item.teacher_id,
        subject_id: item.subject_id,
        title: item.title,
        message: item.message,
        priority: item.priority as 'high' | 'medium' | 'low',
        date: createdDate,
        subject: subjectName,
        subject_name: subjectName,
        teacher_name: teacherName,
        read: false,
        created_at: item.created_at,
      };
    });
  } catch (err) {
    console.warn('Error fetching announcements:', err);
    return initialAnnouncements;
  }
}

export async function createAnnouncement(params: {
  title: string;
  message: string;
  subjectId?: string | null;
  priority?: 'high' | 'medium' | 'low';
}): Promise<Announcement> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('You must be logged in as a faculty member to publish announcements.');
  }

  const payload: any = {
    teacher_id: userData.user.id,
    title: params.title.trim(),
    message: params.message.trim(),
    priority: params.priority || 'medium',
  };

  if (params.subjectId) {
    payload.subject_id = params.subjectId;
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert(payload)
    .select(`
      id,
      teacher_id,
      subject_id,
      title,
      message,
      priority,
      created_at,
      subjects (
        subject_name
      )
    `)
    .single();

  if (error) {
    console.error('Error inserting announcement:', error);
    throw error;
  }

  return {
    id: data.id,
    teacher_id: data.teacher_id,
    subject_id: data.subject_id,
    title: data.title,
    message: data.message,
    priority: data.priority,
    date: new Date(data.created_at).toISOString().split('T')[0],
    subject: (data as any).subjects?.subject_name || 'General',
    read: false,
    created_at: data.created_at,
  };
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }

  return true;
}
