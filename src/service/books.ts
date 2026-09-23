import { supabase } from '@/lib/supabase';
import type { Book } from '@/types';

export async function getBooks(subjectId?: string, unitId?: string): Promise<Book[]> {
  try {
    let query = supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    if (unitId) {
      query = query.eq('unit_id', unitId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      edition: b.edition,
      description: b.description,
      cover_url: b.cover_url,
      file_url: b.file_url,
      purchase_link: b.purchase_link,
      subject_id: b.subject_id,
      unit_id: b.unit_id,
      teacher_id: b.teacher_id,
      created_at: b.created_at,
    }));
  } catch (err) {
    console.warn('Error fetching books from Supabase:', err);
    return [];
  }
}

export async function addBook(params: {
  title: string;
  subjectId: string;
  unitId?: string | null;
  author?: string;
  edition?: string;
  description?: string;
  coverUrl?: string;
  fileUrl?: string;
  purchaseLink?: string;
}): Promise<Book> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('You must be logged in as a faculty member to add textbooks.');
  }

  const payload: any = {
    teacher_id: userData.user.id,
    subject_id: params.subjectId,
    title: params.title.trim(),
    author: params.author?.trim() || null,
    edition: params.edition?.trim() || null,
    description: params.description?.trim() || null,
    cover_url: params.coverUrl?.trim() || null,
    file_url: params.fileUrl?.trim() || null,
    purchase_link: params.purchaseLink?.trim() || null,
  };

  if (params.unitId) {
    payload.unit_id = params.unitId;
  }

  const { data, error } = await supabase
    .from('books')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Error adding book:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    author: data.author,
    edition: data.edition,
    description: data.description,
    cover_url: data.cover_url,
    file_url: data.file_url,
    purchase_link: data.purchase_link,
    subject_id: data.subject_id,
    unit_id: data.unit_id,
    teacher_id: data.teacher_id,
    created_at: data.created_at,
  };
}

export async function deleteBook(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting book:', error);
    throw error;
  }

  return true;
}
