BEGIN;

-- =========================================================
-- SMART STUDY: STUDENT ARREAR SUBJECTS (FIXED)
-- =========================================================

-- 1. Helper function: check whether the logged-in user
--    is a student. SECURITY DEFINER avoids profile RLS
--    recursion; fixed search_path limits object spoofing.

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'student'
  );
$$;

-- 2. Helper function: check whether the logged-in user
--    is a teacher.

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'teacher'
  );
$$;

-- Restrict helper execution to authenticated users only.
REVOKE ALL ON FUNCTION public.is_student() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated;

REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;


-- =========================================================
-- 3. Table: student_subjects (Arrear tracking)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'arrear' CHECK (type = 'arrear'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_subject UNIQUE (student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subjects_student_id
  ON public.student_subjects(student_id);

CREATE INDEX IF NOT EXISTS idx_student_subjects_subject_id
  ON public.student_subjects(subject_id);


-- =========================================================
-- 4. Row Level Security (RLS)
-- =========================================================

ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

-- Drop legacy policy names if any exist
DROP POLICY IF EXISTS "ss_select_own_or_teaching" ON public.student_subjects;
DROP POLICY IF EXISTS "ss_insert_own_arrear" ON public.student_subjects;
DROP POLICY IF EXISTS "ss_delete_own_arrear" ON public.student_subjects;
DROP POLICY IF EXISTS "Students can view own enrolled subjects" ON public.student_subjects;
DROP POLICY IF EXISTS "Students can insert own enrolled subjects" ON public.student_subjects;
DROP POLICY IF EXISTS "Students can delete own enrolled subjects" ON public.student_subjects;
DROP POLICY IF EXISTS "Students can update own enrolled subjects" ON public.student_subjects;

-- Policy A: SELECT
-- Students can read their own arrear rows.
-- Teachers can read all student arrear enrollments.
CREATE POLICY "ss_select_own_or_teaching"
ON public.student_subjects
FOR SELECT
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR (SELECT public.is_teacher())
);

-- Policy B: INSERT
-- Students can only insert rows for themselves, with type='arrear',
-- and only for subjects belonging to an earlier semester than their own.
CREATE POLICY "ss_insert_own_arrear"
ON public.student_subjects
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = (SELECT auth.uid())
  AND type = 'arrear'
  AND (SELECT public.is_student())
  AND EXISTS (
    SELECT 1
    FROM public.subjects s
    CROSS JOIN public.profiles p
    WHERE s.id = student_subjects.subject_id
      AND p.id = (SELECT auth.uid())
      AND p.semester IS NOT NULL
      AND s.semester IS NOT NULL
      AND s.semester < p.semester
  )
);

-- Policy C: DELETE
-- Students can only remove their own arrear entries.
CREATE POLICY "ss_delete_own_arrear"
ON public.student_subjects
FOR DELETE
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  AND (SELECT public.is_student())
);


-- =========================================================
-- 5. Strict Grants
-- =========================================================

REVOKE ALL ON TABLE public.student_subjects FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.student_subjects TO authenticated;
GRANT ALL ON TABLE public.student_subjects TO service_role;

COMMIT;
