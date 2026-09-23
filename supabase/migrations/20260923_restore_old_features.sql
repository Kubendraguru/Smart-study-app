-- ==============================================================================
-- Migration: Restore Old Features (Announcements, YouTube Videos & Books/Notes)
-- Execute this script in the Supabase Dashboard SQL Editor:
-- (https://supabase.com/dashboard/project/gtiovdtakkjwwjhwotlc/sql)
-- ==============================================================================

-- 1. Helper function to check if user is a teacher (if not already created)
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


-- ==============================================================================
-- 2. ANNOUNCEMENTS TABLE (Faculty creates announcements, students view)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_teacher_id ON public.announcements(teacher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_subject_id ON public.announcements(subject_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Teachers can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Teachers can update their announcements" ON public.announcements;
DROP POLICY IF EXISTS "Teachers can delete their announcements" ON public.announcements;

CREATE POLICY "Anyone authenticated can view announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Teachers can insert announcements"
ON public.announcements FOR INSERT
TO authenticated
WITH CHECK (public.is_teacher() AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their announcements"
ON public.announcements FOR UPDATE
TO authenticated
USING (public.is_teacher() AND auth.uid() = teacher_id)
WITH CHECK (public.is_teacher() AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their announcements"
ON public.announcements FOR DELETE
TO authenticated
USING (public.is_teacher() AND auth.uid() = teacher_id);


-- ==============================================================================
-- 3. VIDEOS TABLE (Faculty links YouTube videos unit-wise & subject-wise)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    channel TEXT DEFAULT 'Educational Channel',
    duration TEXT DEFAULT '15:00',
    thumbnail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_videos_unit_id ON public.videos(unit_id);
CREATE INDEX IF NOT EXISTS idx_videos_subject_id ON public.videos(subject_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view videos" ON public.videos;
DROP POLICY IF EXISTS "Teachers can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Teachers can update their videos" ON public.videos;
DROP POLICY IF EXISTS "Teachers can delete their videos" ON public.videos;

CREATE POLICY "Anyone authenticated can view videos"
ON public.videos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Teachers can insert videos"
ON public.videos FOR INSERT
TO authenticated
WITH CHECK (public.is_teacher() AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their videos"
ON public.videos FOR UPDATE
TO authenticated
USING (public.is_teacher() AND auth.uid() = teacher_id)
WITH CHECK (public.is_teacher() AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their videos"
ON public.videos FOR DELETE
TO authenticated
USING (public.is_teacher() AND auth.uid() = teacher_id);


-- ==============================================================================
-- 4. BOOKS & NOTES TABLE (Faculty manages textbooks & reference notes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    author TEXT,
    edition TEXT,
    description TEXT,
    cover_url TEXT,
    file_url TEXT,
    purchase_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_subject_id ON public.books(subject_id);
CREATE INDEX IF NOT EXISTS idx_books_unit_id ON public.books(unit_id);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at DESC);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view books" ON public.books;
DROP POLICY IF EXISTS "Teachers can insert books" ON public.books;
DROP POLICY IF EXISTS "Teachers can update their books" ON public.books;
DROP POLICY IF EXISTS "Teachers can delete their books" ON public.books;

CREATE POLICY "Anyone authenticated can view books"
ON public.books FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Teachers can insert books"
ON public.books FOR INSERT
TO authenticated
WITH CHECK (public.is_teacher() AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their books"
ON public.books FOR UPDATE
TO authenticated
USING (public.is_teacher() AND auth.uid() = teacher_id)
WITH CHECK (public.is_teacher() AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their books"
ON public.books FOR DELETE
TO authenticated
USING (public.is_teacher() AND auth.uid() = teacher_id);
