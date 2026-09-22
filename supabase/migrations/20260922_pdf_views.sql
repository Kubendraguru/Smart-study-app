-- ==============================================================================
-- Step 2: PDF View Tracking Migration
-- Execute this script in the Supabase Dashboard SQL Editor
-- (https://supabase.com/dashboard/project/gtiovdtakkjwwjhwotlc/sql)
-- ==============================================================================

-- 1. Create helper function to check if the user is a teacher (bypasses RLS recursion safely)
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;

-- 2. Create the pdf_views table
CREATE TABLE IF NOT EXISTS public.pdf_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdf_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_pdf_student_view UNIQUE (pdf_id, student_id)
);

-- 3. Create indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_pdf_views_pdf_id ON public.pdf_views(pdf_id);
CREATE INDEX IF NOT EXISTS idx_pdf_views_student_id ON public.pdf_views(student_id);

-- 4. Enable Row Level Security
ALTER TABLE public.pdf_views ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies on pdf_views
DROP POLICY IF EXISTS "Students can insert their own view" ON public.pdf_views;
DROP POLICY IF EXISTS "Students can update their own view timestamp" ON public.pdf_views;
DROP POLICY IF EXISTS "Users can view tracking records" ON public.pdf_views;

-- Students can insert their own view record
CREATE POLICY "Students can insert their own view"
ON public.pdf_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Students can update their own last-viewed timestamp
CREATE POLICY "Students can update their own view timestamp"
ON public.pdf_views FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Authenticated users (the student themselves or any teacher) can read views
CREATE POLICY "Users can view tracking records"
ON public.pdf_views FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id
  OR public.is_teacher()
);

-- 6. Enable teachers to read student profiles for attendance / tracking lists
DROP POLICY IF EXISTS "Teachers can read student profiles" ON public.profiles;

CREATE POLICY "Teachers can read student profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_teacher()
);
