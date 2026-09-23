import { supabase } from "@/lib/supabase";

export async function signUp(data: {
  email: string;
  password: string;
}) {
  return await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(userId?: string) {
  const targetId = userId || (await getCurrentUser())?.id;
  if (!targetId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", targetId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

export async function updateProfile(params: {
  full_name?: string;
  designation?: string;
  department?: string;
  college?: string;
  semester?: number;
  register_number?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No authenticated user found.");

  const payload: any = {
    id: user.id,
  };
  if (params.full_name !== undefined) payload.full_name = params.full_name.trim();
  if (params.designation !== undefined) payload.designation = params.designation.trim();
  if (params.department !== undefined) payload.department = params.department.trim();
  if (params.college !== undefined) payload.college = params.college.trim();
  if (params.semester !== undefined) payload.semester = Number(params.semester);
  if (params.register_number !== undefined) payload.register_number = params.register_number.trim();

  // Try update first
  const { data: updateData, error: updateError } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("*");

  if (updateError) {
    console.error("Error updating profile:", updateError);
    throw updateError;
  }

  // If update matched 0 rows (e.g. initial profile row missing), insert/upsert it
  if (!updateData || updateData.length === 0) {
    const { data: upsertData, error: upsertError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (upsertError) {
      console.error("Error upserting profile:", upsertError);
      throw upsertError;
    }
    return upsertData;
  }

  return updateData[0];
}