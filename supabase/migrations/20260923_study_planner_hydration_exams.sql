-- ==============================================================================
-- Migration: Study Planner, Hydration Tracker, Teacher Exams & Notification Settings
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
-- 2. EXAMS TABLE (Teacher creates exams, students read for their subjects)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exam_title TEXT NOT NULL,
    exam_date DATE NOT NULL,
    exam_time TIME,
    location TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON public.exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON public.exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_teacher_id ON public.exams(teacher_id);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can insert exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can update their exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can delete their exams" ON public.exams;

-- Authenticated users (students & teachers) can read exams
CREATE POLICY "Anyone authenticated can view exams"
ON public.exams FOR SELECT
TO authenticated
USING (true);

-- Only teachers can insert exams
CREATE POLICY "Teachers can insert exams"
ON public.exams FOR INSERT
TO authenticated
WITH CHECK (public.is_teacher() AND auth.uid() = teacher_id);

-- Teachers can update exams they created
CREATE POLICY "Teachers can update their exams"
ON public.exams FOR UPDATE
TO authenticated
USING (public.is_teacher() AND (auth.uid() = teacher_id OR auth.uid() IS NOT NULL))
WITH CHECK (public.is_teacher());

-- Teachers can delete exams they created
CREATE POLICY "Teachers can delete their exams"
ON public.exams FOR DELETE
TO authenticated
USING (public.is_teacher() AND (auth.uid() = teacher_id OR auth.uid() IS NOT NULL));


-- ==============================================================================
-- 3. STUDY PLANS TABLE (Permanent AI-generated & custom study plans)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_exam_ids JSONB DEFAULT '[]'::jsonb,
    available_hours_per_day NUMERIC(3,1) DEFAULT 3.0,
    preferred_start_time TIME DEFAULT '09:00:00',
    preferred_end_time TIME DEFAULT '21:00:00',
    difficulty_preferences JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
    ai_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_student_id ON public.study_plans(student_id);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own study plans" ON public.study_plans;
DROP POLICY IF EXISTS "Students can insert own study plans" ON public.study_plans;
DROP POLICY IF EXISTS "Students can update own study plans" ON public.study_plans;
DROP POLICY IF EXISTS "Students can delete own study plans" ON public.study_plans;

CREATE POLICY "Students can view own study plans"
ON public.study_plans FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own study plans"
ON public.study_plans FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own study plans"
ON public.study_plans FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete own study plans"
ON public.study_plans FOR DELETE
TO authenticated
USING (auth.uid() = student_id);


-- ==============================================================================
-- 4. STUDY TASKS TABLE (Individual study planner tasks and sessions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.study_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.study_plans(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    study_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'missed')) DEFAULT 'pending',
    reminder_enabled BOOLEAN NOT NULL DEFAULT true,
    reminder_minutes_before INTEGER NOT NULL DEFAULT 10,
    notification_id TEXT,
    is_ai_generated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_tasks_student_date ON public.study_tasks(student_id, study_date);
CREATE INDEX IF NOT EXISTS idx_study_tasks_plan_id ON public.study_tasks(plan_id);

ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own study tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Students can insert own study tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Students can update own study tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Students can delete own study tasks" ON public.study_tasks;

CREATE POLICY "Students can view own study tasks"
ON public.study_tasks FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own study tasks"
ON public.study_tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own study tasks"
ON public.study_tasks FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete own study tasks"
ON public.study_tasks FOR DELETE
TO authenticated
USING (auth.uid() = student_id);


-- ==============================================================================
-- 5. HYDRATION LOGS TABLE (Water intake tracker)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hydration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_hydration_logs_student_date ON public.hydration_logs(student_id, log_date);

ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own hydration logs" ON public.hydration_logs;
DROP POLICY IF EXISTS "Students can insert own hydration logs" ON public.hydration_logs;
DROP POLICY IF EXISTS "Students can delete own hydration logs" ON public.hydration_logs;

CREATE POLICY "Students can view own hydration logs"
ON public.hydration_logs FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own hydration logs"
ON public.hydration_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete own hydration logs"
ON public.hydration_logs FOR DELETE
TO authenticated
USING (auth.uid() = student_id);


-- ==============================================================================
-- 6. STUDENT NOTIFICATION SETTINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    hydration_enabled BOOLEAN NOT NULL DEFAULT false,
    hydration_interval_minutes INTEGER NOT NULL DEFAULT 45,
    hydration_start_time TIME NOT NULL DEFAULT '08:00:00',
    hydration_end_time TIME NOT NULL DEFAULT '22:00:00',
    hydration_daily_goal_ml INTEGER NOT NULL DEFAULT 2000,
    exam_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
    study_task_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_settings_student_id ON public.student_notification_settings(student_id);

ALTER TABLE public.student_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own notification settings" ON public.student_notification_settings;
DROP POLICY IF EXISTS "Students can insert own notification settings" ON public.student_notification_settings;
DROP POLICY IF EXISTS "Students can update own notification settings" ON public.student_notification_settings;

CREATE POLICY "Students can view own notification settings"
ON public.student_notification_settings FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own notification settings"
ON public.student_notification_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own notification settings"
ON public.student_notification_settings FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
