import { supabase } from "@/lib/supabase";

export async function getSubjects() {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("semester");

  if (error) throw error;

  return data;
}

export async function getSubject(id: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}