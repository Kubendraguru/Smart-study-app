-- =========================================================
-- SMART STUDY: SEED UNITS 1 TO 5 FOR ALL SUBJECTS
-- =========================================================

-- Ensures every subject in public.subjects has all 5 syllabus units
DO $$
DECLARE
  sub RECORD;
  u_num INT;
  u_title TEXT;
BEGIN
  FOR sub IN SELECT id, subject_name FROM public.subjects LOOP
    FOR u_num IN 1..5 LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.units 
        WHERE subject_id = sub.id AND unit_number = u_num
      ) THEN
        CASE u_num
          WHEN 1 THEN u_title := 'Unit 1: Introduction & Fundamentals';
          WHEN 2 THEN u_title := 'Unit 2: Core Concepts & Principles';
          WHEN 3 THEN u_title := 'Unit 3: Architecture & Modeling';
          WHEN 4 THEN u_title := 'Unit 4: Implementation & Algorithms';
          WHEN 5 THEN u_title := 'Unit 5: Applications & Case Studies';
        END CASE;

        INSERT INTO public.units (id, subject_id, unit_number, unit_title, description)
        VALUES (
          gen_random_uuid(),
          sub.id,
          u_num,
          u_title,
          'Comprehensive coverage of syllabus topics, lecture notes, and question bank.'
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
