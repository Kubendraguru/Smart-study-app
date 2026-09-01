import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: "student" | "teacher" | null;
};
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"student" | "teacher" | null>(null);

  useEffect(() => {
  supabase.auth.getUser().then(async ({ data }) => {
  setUser(data.user);

  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setRole(profile?.role ?? null);
  }

  setLoading(false);
});
  const {
  data: { subscription },
} = supabase.auth.onAuthStateChange(async (_event, session) => {
     setUser(session?.user ?? null);

if (session?.user) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  setRole(profile?.role ?? null);
} else {
  setRole(null);
}
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
   <AuthContext.Provider value={{ user, loading, role }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}