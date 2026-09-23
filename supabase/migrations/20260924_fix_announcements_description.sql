BEGIN;

-- =========================================================
-- SMART STUDY: FIX ANNOUNCEMENTS SCHEMA (MESSAGE & DESCRIPTION)
-- =========================================================

-- 1. Ensure both message and description columns exist
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Backfill columns so both contain text
UPDATE public.announcements 
SET message = description 
WHERE message IS NULL AND description IS NOT NULL;

UPDATE public.announcements 
SET description = message 
WHERE description IS NULL AND message IS NOT NULL;

-- 3. Drop NOT NULL restriction from description column
ALTER TABLE public.announcements 
ALTER COLUMN description DROP NOT NULL;

COMMIT;
