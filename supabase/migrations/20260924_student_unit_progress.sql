-- =========================================================
-- SMART STUDY: STUDENT UNIT PROGRESS TRACKING
-- =========================================================

-- 1. Create student_unit_progress table to track explicit unit completions
CREATE TABLE IF NOT EXISTS public.student_unit_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_unit_progress UNIQUE (student_id, unit_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_unit_progress_student_id 
  ON public.student_unit_progress(student_id);

CREATE INDEX IF NOT EXISTS idx_student_unit_progress_unit_id 
  ON public.student_unit_progress(unit_id);

CREATE INDEX IF NOT EXISTS idx_student_unit_progress_completed 
  ON public.student_unit_progress(student_id, completed);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.student_unit_progress ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- SELECT: Students can view their own progress; Teachers can view all student progress
DROP POLICY IF EXISTS "Allow select student_unit_progress" ON public.student_unit_progress;
CREATE POLICY "Allow select student_unit_progress"
ON public.student_unit_progress
FOR SELECT
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR (SELECT public.is_teacher())
);

-- INSERT: Students can insert their own unit progress
DROP POLICY IF EXISTS "Allow insert student_unit_progress" ON public.student_unit_progress;
CREATE POLICY "Allow insert student_unit_progress"
ON public.student_unit_progress
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = (SELECT auth.uid())
  AND (SELECT public.is_student())
);

-- UPDATE: Students can update their own unit progress
DROP POLICY IF EXISTS "Allow update student_unit_progress" ON public.student_unit_progress;
CREATE POLICY "Allow update student_unit_progress"
ON public.student_unit_progress
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

-- DELETE: Students can delete their own unit progress
DROP POLICY IF EXISTS "Allow delete student_unit_progress" ON public.student_unit_progress;
CREATE POLICY "Allow delete student_unit_progress"
ON public.student_unit_progress
FOR DELETE
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  AND (SELECT public.is_student())
);

-- 5. Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_unit_progress TO authenticated;
