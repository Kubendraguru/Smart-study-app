BEGIN;

-- ====================================================================
-- SMART STUDY: CONSOLIDATED TEACHER & ARREAR SUBJECTS SETUP
-- Safe, idempotent, non-destructive migration.
-- ====================================================================

-- 1. Helper functions
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

REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_student() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated;


-- 2. updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;


-- 3. Teacher designation on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS designation TEXT
DEFAULT 'Faculty Member';


-- 4. YouTube video & playlist fields
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS is_playlist BOOLEAN
DEFAULT false;

ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS video_type TEXT
DEFAULT 'video';

CREATE INDEX IF NOT EXISTS idx_videos_is_playlist
ON public.videos(is_playlist);


-- 5. Student Arrear Subjects table
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

ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ss_select_own_or_teaching" ON public.student_subjects;
DROP POLICY IF EXISTS "ss_insert_own_arrear" ON public.student_subjects;
DROP POLICY IF EXISTS "ss_delete_own_arrear" ON public.student_subjects;
DROP POLICY IF EXISTS "Students can view own enrolled subjects" ON public.student_subjects;
DROP POLICY IF EXISTS "Students can insert own enrolled subjects" ON public.student_subjects;
DROP POLICY IF EXISTS "Students can delete own enrolled subjects" ON public.student_subjects;
DROP POLICY IF EXISTS "Students can update own enrolled subjects" ON public.student_subjects;

CREATE POLICY "ss_select_own_or_teaching"
ON public.student_subjects
FOR SELECT
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR (SELECT public.is_teacher())
);

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

CREATE POLICY "ss_delete_own_arrear"
ON public.student_subjects
FOR DELETE
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  AND (SELECT public.is_student())
);

REVOKE ALL ON TABLE public.student_subjects FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.student_subjects TO authenticated;
GRANT ALL ON TABLE public.student_subjects TO service_role;


-- 6. Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    teacher_id UUID NOT NULL
      REFERENCES public.profiles(id) ON DELETE CASCADE,

    subject_id UUID NOT NULL
      REFERENCES public.subjects(id) ON DELETE CASCADE,

    unit_id UUID
      REFERENCES public.units(id) ON DELETE SET NULL,

    title TEXT NOT NULL,
    description TEXT,

    due_date DATE NOT NULL,
    due_time TIME,

    max_marks INTEGER NOT NULL DEFAULT 100
      CHECK (max_marks > 0),

    attachment_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id
ON public.assignments(teacher_id);

CREATE INDEX IF NOT EXISTS idx_assignments_subject_id
ON public.assignments(subject_id);

CREATE INDEX IF NOT EXISTS idx_assignments_unit_id
ON public.assignments(unit_id);

CREATE INDEX IF NOT EXISTS idx_assignments_due_date
ON public.assignments(due_date);

DROP TRIGGER IF EXISTS tr_assignments_updated_at
ON public.assignments;

CREATE TRIGGER tr_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.assignments
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authorized users can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can insert assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can update own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can delete own assignments" ON public.assignments;
DROP POLICY IF EXISTS "ss_assignments_select" ON public.assignments;
DROP POLICY IF EXISTS "ss_assignments_insert" ON public.assignments;
DROP POLICY IF EXISTS "ss_assignments_update" ON public.assignments;
DROP POLICY IF EXISTS "ss_assignments_delete" ON public.assignments;

CREATE POLICY "ss_assignments_select"
ON public.assignments
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_teacher())
  OR
  (
    (SELECT public.is_student())
    AND (
      EXISTS (
        SELECT 1
        FROM public.subjects s
        JOIN public.profiles p
          ON p.id = (SELECT auth.uid())
        WHERE s.id = assignments.subject_id
          AND (p.semester IS NULL OR s.semester = p.semester)
      )
      OR EXISTS (
        SELECT 1
        FROM public.student_subjects ss
        WHERE ss.subject_id = assignments.subject_id
          AND ss.student_id = (SELECT auth.uid())
          AND ss.type = 'arrear'
      )
    )
  )
);

CREATE POLICY "ss_assignments_insert"
ON public.assignments
FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id = (SELECT auth.uid())
  AND (SELECT public.is_teacher())
  AND EXISTS (
    SELECT 1
    FROM public.subjects s
    WHERE s.id = assignments.subject_id
  )
  AND (
    unit_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.units u
      WHERE u.id = assignments.unit_id
        AND u.subject_id = assignments.subject_id
    )
  )
);

CREATE POLICY "ss_assignments_update"
ON public.assignments
FOR UPDATE
TO authenticated
USING (
  teacher_id = (SELECT auth.uid())
  AND (SELECT public.is_teacher())
)
WITH CHECK (
  teacher_id = (SELECT auth.uid())
  AND (SELECT public.is_teacher())
  AND (
    unit_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.units u
      WHERE u.id = assignments.unit_id
        AND u.subject_id = assignments.subject_id
    )
  )
);

CREATE POLICY "ss_assignments_delete"
ON public.assignments
FOR DELETE
TO authenticated
USING (
  teacher_id = (SELECT auth.uid())
  AND (SELECT public.is_teacher())
);

REVOKE ALL ON TABLE public.assignments FROM anon;
REVOKE ALL ON TABLE public.assignments FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.assignments
TO authenticated;

GRANT ALL
ON TABLE public.assignments
TO service_role;

COMMIT;
