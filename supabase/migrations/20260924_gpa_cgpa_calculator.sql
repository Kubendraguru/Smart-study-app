-- ====================================================================
-- Migration: GPA & CGPA Calculator for Smart Study Application
-- Created: 2026-09-24
-- Description: Creates student GPA settings, academic semester records,
--              and course grade records with strict Row Level Security.
-- ====================================================================

-- 1. Student GPA & Grading Scheme Preferences Table
CREATE TABLE IF NOT EXISTS public.student_gpa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    grading_scheme_id TEXT NOT NULL DEFAULT 'anna_univ_10',
    grading_scheme_name TEXT NOT NULL DEFAULT 'Anna University 10-Point Scale',
    max_grade_point NUMERIC(4, 2) NOT NULL DEFAULT 10.00,
    passing_min_points NUMERIC(4, 2) NOT NULL DEFAULT 6.00,
    repeat_policy TEXT NOT NULL DEFAULT 'latest_attempt' 
        CHECK (repeat_policy IN ('latest_attempt', 'highest_attempt', 'all_attempts')),
    custom_grades JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_student_gpa_settings_student_id UNIQUE (student_id)
);

-- 2. Student Academic Semesters Table
CREATE TABLE IF NOT EXISTS public.student_academic_semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL CHECK (semester_number >= 1 AND semester_number <= 12),
    semester_label TEXT NOT NULL DEFAULT '',
    academic_year TEXT,
    gpa NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    total_credits NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    earned_credits NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    total_points NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_student_semester UNIQUE (student_id, semester_number)
);

-- 3. Student Academic Courses & Grades Table
CREATE TABLE IF NOT EXISTS public.student_academic_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.student_academic_semesters(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL CHECK (semester_number >= 1 AND semester_number <= 12),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_code TEXT,
    subject_name TEXT NOT NULL,
    credits NUMERIC(4, 2) NOT NULL CHECK (credits > 0),
    grade TEXT NOT NULL,
    grade_point NUMERIC(4, 2) NOT NULL CHECK (grade_point >= 0),
    is_arrear BOOLEAN NOT NULL DEFAULT false,
    is_cleared BOOLEAN NOT NULL DEFAULT true,
    is_excluded BOOLEAN NOT NULL DEFAULT false,
    attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- Indexes for High Query Performance
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_gpa_settings_student_id ON public.student_gpa_settings(student_id);
CREATE INDEX IF NOT EXISTS idx_academic_semesters_student ON public.student_academic_semesters(student_id, semester_number);
CREATE INDEX IF NOT EXISTS idx_academic_courses_student ON public.student_academic_courses(student_id, semester_number);
CREATE INDEX IF NOT EXISTS idx_academic_courses_subject ON public.student_academic_courses(subject_id);

-- ====================================================================
-- Enable Row Level Security (RLS)
-- ====================================================================

ALTER TABLE public.student_gpa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_academic_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_academic_courses ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- RLS Policies (Students can only view and modify their own records)
-- ====================================================================

-- Policies for student_gpa_settings
DROP POLICY IF EXISTS "Students can manage own gpa settings" ON public.student_gpa_settings;
CREATE POLICY "Students can manage own gpa settings"
    ON public.student_gpa_settings
    FOR ALL
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Policies for student_academic_semesters
DROP POLICY IF EXISTS "Students can manage own academic semesters" ON public.student_academic_semesters;
CREATE POLICY "Students can manage own academic semesters"
    ON public.student_academic_semesters
    FOR ALL
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Policies for student_academic_courses
DROP POLICY IF EXISTS "Students can manage own academic courses" ON public.student_academic_courses;
CREATE POLICY "Students can manage own academic courses"
    ON public.student_academic_courses
    FOR ALL
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- ====================================================================
-- Grant Access to Authenticated Users
-- ====================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_gpa_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_academic_semesters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_academic_courses TO authenticated;
