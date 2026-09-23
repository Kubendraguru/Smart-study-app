-- =========================================================
-- SMART STUDY: FOCUS LOCK / STUDY MODE SESSIONS
-- =========================================================

-- 1. Create focus_sessions table
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  planned_duration_minutes INTEGER NOT NULL,
  actual_duration_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'manually_ended', 'emergency_ended')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_student_id 
  ON public.focus_sessions(student_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_status 
  ON public.focus_sessions(status);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at 
  ON public.focus_sessions(started_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- SELECT: Students can view their own focus sessions; Teachers can view student focus sessions
DROP POLICY IF EXISTS "Allow select focus_sessions" ON public.focus_sessions;
CREATE POLICY "Allow select focus_sessions"
ON public.focus_sessions
FOR SELECT
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR (SELECT public.is_teacher())
);

-- INSERT: Students can insert their own focus sessions
DROP POLICY IF EXISTS "Allow insert focus_sessions" ON public.focus_sessions;
CREATE POLICY "Allow insert focus_sessions"
ON public.focus_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = (SELECT auth.uid())
  AND (SELECT public.is_student())
);

-- UPDATE: Students can update their own focus sessions
DROP POLICY IF EXISTS "Allow update focus_sessions" ON public.focus_sessions;
CREATE POLICY "Allow update focus_sessions"
ON public.focus_sessions
FOR UPDATE
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  AND (SELECT public.is_student())
)
WITH CHECK (
  student_id = (SELECT auth.uid())
  AND (SELECT public.is_student())
);

-- DELETE: Students can delete their own focus sessions
DROP POLICY IF EXISTS "Allow delete focus_sessions" ON public.focus_sessions;
CREATE POLICY "Allow delete focus_sessions"
ON public.focus_sessions
FOR DELETE
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  AND (SELECT public.is_student())
);

-- 5. Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_sessions TO authenticated;
