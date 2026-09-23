-- =========================================================
-- SMART STUDY: ARREAR STATUS & PASS CELEBRATION MIGRATION
-- =========================================================

-- 1. Add status and passed_at columns to student_subjects if not existing
DO $$
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'student_subjects' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.student_subjects 
    ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passed'));
  END IF;

  -- Add passed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'student_subjects' 
      AND column_name = 'passed_at'
  ) THEN
    ALTER TABLE public.student_subjects 
    ADD COLUMN passed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_student_subjects_status 
  ON public.student_subjects(student_id, status);

-- 3. RLS: Add / update UPDATE policy for student_subjects
DROP POLICY IF EXISTS "ss_update_own_arrear" ON public.student_subjects;
CREATE POLICY "ss_update_own_arrear"
ON public.student_subjects
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

-- 4. Ensure authenticated users have update permissions
GRANT UPDATE ON TABLE public.student_subjects TO authenticated;
