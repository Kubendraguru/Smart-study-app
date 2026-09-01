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