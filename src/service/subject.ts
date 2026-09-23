import { supabase } from "@/lib/supabase";

export async function getSubjects() {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("semester", { ascending: true })
    .order("subject_name", { ascending: true });

  if (error) {
    console.error("Error fetching subjects:", error);
    throw error;
  }

  return data || [];
}

export async function getSubject(id: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching subject:", error);
    throw error;
  }

  return data;
}

export async function createSubject(params: {
  subject_name: string;
  subject_code: string;
  semester: number;
  department: string;
  credits: number;
  description?: string;
}) {
  const { data, error } = await supabase
    .from("subjects")
    .insert([
      {
        subject_name: params.subject_name.trim(),
        subject_code: params.subject_code.trim().toUpperCase(),
        semester: Number(params.semester),
        department: params.department.trim(),
        credits: Number(params.credits) || 3,
        description: params.description?.trim() || null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating subject:", error);
    throw error;
  }

  return data;
}

export async function updateSubject(
  id: string,
  params: Partial<{
    subject_name: string;
    subject_code: string;
    semester: number;
    department: string;
    credits: number;
    description: string;
  }>
) {
  const { data, error } = await supabase
    .from("subjects")
    .update(params)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating subject:", error);
    throw error;
  }

  return data;
}

export async function deleteSubject(id: string) {
  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting subject:", error);
    throw error;
  }

  return true;
}

export async function getUnits(subjectId: string) {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("subject_id", subjectId)
    .order("unit_number", { ascending: true });

  if (error) {
    console.error("Error fetching units:", error);
    throw error;
  }

  return data || [];
}

export async function createUnit(params: {
  subject_id: string;
  unit_number: number;
  unit_title: string;
  description?: string;
}) {
  const { data, error } = await supabase
    .from("units")
    .insert([
      {
        subject_id: params.subject_id,
        unit_number: Number(params.unit_number),
        unit_title: params.unit_title.trim(),
        description: params.description?.trim() || null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating unit:", error);
    throw error;
  }

  return data;
}

export async function updateUnit(
  id: string,
  params: Partial<{
    unit_number: number;
    unit_title: string;
    description: string;
  }>
) {
  const { data, error } = await supabase
    .from("units")
    .update(params)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating unit:", error);
    throw error;
  }

  return data;
}

export async function deleteUnit(id: string) {
  const { error } = await supabase
    .from("units")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting unit:", error);
    throw error;
  }

  return true;
}