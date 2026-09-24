import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  GradingScheme,
  GradingSchemeId,
  GradeDefinition,
  StudentGpaSettings,
  AcademicCourse,
  SemesterAcademicSummary,
  SemesterGpaTrend,
  OverallAcademicSummary,
} from '@/types';

// ====================================================================
// Preset Grading Schemes
// ====================================================================

export const PRESET_GRADING_SCHEMES: GradingScheme[] = [
  {
    id: 'anna_univ_10',
    name: 'Anna University 10-Point Scale (Regulation 2021/2017)',
    description: 'Standard 10-point credit system used across Anna University & affiliated engineering colleges.',
    maxGradePoint: 10.0,
    passingMinPoints: 6.0,
    isOfficialPreset: true,
    grades: [
      { grade: 'O', points: 10.0, isPass: true, isCounted: true, description: 'Outstanding (91 - 100)' },
      { grade: 'A+', points: 9.0, isPass: true, isCounted: true, description: 'Excellent (81 - 90)' },
      { grade: 'A', points: 8.0, isPass: true, isCounted: true, description: 'Very Good (71 - 80)' },
      { grade: 'B+', points: 7.0, isPass: true, isCounted: true, description: 'Good (61 - 70)' },
      { grade: 'B', points: 6.0, isPass: true, isCounted: true, description: 'Average / Pass (50 - 60)' },
      { grade: 'C', points: 5.0, isPass: true, isCounted: true, description: 'Satisfactory (earlier reg.)' },
      { grade: 'U', points: 0.0, isPass: false, isCounted: true, description: 'Re-appearance / Arrear' },
      { grade: 'RA', points: 0.0, isPass: false, isCounted: true, description: 'Re-appearance / Arrear' },
      { grade: 'SA', points: 0.0, isPass: false, isCounted: true, description: 'Shortage of Attendance' },
      { grade: 'W', points: 0.0, isPass: false, isCounted: false, description: 'Withdrawal (Excluded)' },
    ],
  },
  {
    id: 'ugc_10',
    name: 'UGC / AICTE 10-Point Standard CBCS',
    description: 'Universal Choice Based Credit System (CBCS) standard recommended by UGC & AICTE.',
    maxGradePoint: 10.0,
    passingMinPoints: 4.0,
    isOfficialPreset: true,
    grades: [
      { grade: 'O', points: 10.0, isPass: true, isCounted: true, description: 'Outstanding (90 - 100)' },
      { grade: 'A+', points: 9.0, isPass: true, isCounted: true, description: 'Excellent (80 - 89)' },
      { grade: 'A', points: 8.0, isPass: true, isCounted: true, description: 'Very Good (70 - 79)' },
      { grade: 'B+', points: 7.0, isPass: true, isCounted: true, description: 'Good (60 - 69)' },
      { grade: 'B', points: 6.0, isPass: true, isCounted: true, description: 'Above Average (55 - 59)' },
      { grade: 'C', points: 5.0, isPass: true, isCounted: true, description: 'Average (50 - 54)' },
      { grade: 'P', points: 4.0, isPass: true, isCounted: true, description: 'Pass (40 - 49)' },
      { grade: 'F', points: 0.0, isPass: false, isCounted: true, description: 'Fail / Arrear' },
      { grade: 'Ab', points: 0.0, isPass: false, isCounted: true, description: 'Absent' },
    ],
  },
  {
    id: 'us_4',
    name: 'Standard 4.0 GPA Scale (US / International)',
    description: 'Standard 4-point scale widely utilized for international admissions and MS programs.',
    maxGradePoint: 4.0,
    passingMinPoints: 1.0,
    isOfficialPreset: true,
    grades: [
      { grade: 'A', points: 4.0, isPass: true, isCounted: true, description: '93 - 100%' },
      { grade: 'A-', points: 3.7, isPass: true, isCounted: true, description: '90 - 92%' },
      { grade: 'B+', points: 3.3, isPass: true, isCounted: true, description: '87 - 89%' },
      { grade: 'B', points: 3.0, isPass: true, isCounted: true, description: '83 - 86%' },
      { grade: 'B-', points: 2.7, isPass: true, isCounted: true, description: '80 - 82%' },
      { grade: 'C+', points: 2.3, isPass: true, isCounted: true, description: '77 - 79%' },
      { grade: 'C', points: 2.0, isPass: true, isCounted: true, description: '73 - 76%' },
      { grade: 'C-', points: 1.7, isPass: true, isCounted: true, description: '70 - 72%' },
      { grade: 'D', points: 1.0, isPass: true, isCounted: true, description: '60 - 69% (Pass)' },
      { grade: 'F', points: 0.0, isPass: false, isCounted: true, description: 'Below 60% (Fail)' },
    ],
  },
];

export const DEFAULT_GPA_SETTINGS: StudentGpaSettings = {
  studentId: '',
  gradingSchemeId: 'anna_univ_10',
  gradingSchemeName: 'Anna University 10-Point Scale (Regulation 2021/2017)',
  maxGradePoint: 10.0,
  passingMinPoints: 6.0,
  repeatPolicy: 'latest_attempt',
  customGrades: [],
};

// Storage Cache Keys
const GPA_SETTINGS_CACHE_KEY = '@smart_study_gpa_settings_';
const GPA_SEMESTERS_CACHE_KEY = '@smart_study_gpa_semesters_';

// ====================================================================
// Storage Helpers (Web & Native Local Cache)
// ====================================================================

async function getLocalCache<T>(key: string): Promise<T | null> {
  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(key);
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(key);
    }
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setLocalCache<T>(key: string, value: T): Promise<void> {
  try {
    const json = JSON.stringify(value);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, json);
    }
    await AsyncStorage.setItem(key, json);
  } catch (err) {
    console.warn('Error saving local cache for GPA:', err);
  }
}

// ====================================================================
// Grade & Scheme Helpers
// ====================================================================

export function getActiveGradeDefinitions(settings: StudentGpaSettings): GradeDefinition[] {
  if (settings.gradingSchemeId === 'custom' && settings.customGrades && settings.customGrades.length > 0) {
    return settings.customGrades;
  }
  const preset = PRESET_GRADING_SCHEMES.find((p) => p.id === settings.gradingSchemeId);
  return preset ? preset.grades : PRESET_GRADING_SCHEMES[0].grades;
}

export function lookupGradePoint(gradeStr: string, settings: StudentGpaSettings): { points: number; isPass: boolean; isCounted: boolean } {
  const cleanGrade = (gradeStr || '').trim().toUpperCase();
  const grades = getActiveGradeDefinitions(settings);
  const match = grades.find((g) => g.grade.toUpperCase() === cleanGrade);
  if (match) {
    return { points: match.points, isPass: match.isPass, isCounted: match.isCounted };
  }
  return { points: 0, isPass: false, isCounted: true };
}

// ====================================================================
// Pure Math GPA & CGPA Engine
// ====================================================================

/**
 * Calculates semester GPA using credit-weighted grade points:
 * GPA = Sum(Credits * GradePoints) / Sum(Applicable Credits)
 */
export function calculateSemesterSummary(
  semesterNumber: number,
  courses: AcademicCourse[],
  settings: StudentGpaSettings,
  existingId?: string,
  academicYear?: string
): SemesterAcademicSummary {
  let totalCredits = 0;
  let earnedCredits = 0;
  let totalGradePoints = 0;

  const validCourses = courses.map((c) => {
    const { points, isPass, isCounted } = lookupGradePoint(c.grade, settings);
    const cr = Number(c.credits) || 0;
    const isExcluded = c.isExcluded || !isCounted;

    if (!isExcluded && cr > 0) {
      totalCredits += cr;
      totalGradePoints += cr * points;
      if (isPass || points >= settings.passingMinPoints) {
        earnedCredits += cr;
      }
    }

    return {
      ...c,
      credits: cr,
      gradePoint: points,
      isCleared: isPass || points >= settings.passingMinPoints,
      isExcluded,
    };
  });

  const gpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0.0;

  return {
    id: existingId,
    semesterNumber,
    semesterLabel: `Semester ${semesterNumber}`,
    academicYear,
    courses: validCourses,
    totalCredits: Number(totalCredits.toFixed(2)),
    earnedCredits: Number(earnedCredits.toFixed(2)),
    totalGradePoints: Number(totalGradePoints.toFixed(2)),
    gpa,
    isCalculated: validCourses.length > 0,
  };
}

/**
 * Calculates Cumulative GPA (CGPA) across all saved semesters adhering to repeat-attempt policy:
 * - 'latest_attempt': Uses the most recent attempt for any repeated subject; credits counted only once.
 * - 'highest_attempt': Uses the attempt with the highest grade points; credits counted only once.
 * - 'all_attempts': Includes every attempt in cumulative calculations.
 */
export function calculateOverallAcademicSummary(
  studentId: string,
  semesters: SemesterAcademicSummary[],
  settings: StudentGpaSettings
): OverallAcademicSummary {
  const sortedSemesters = [...semesters].sort((a, b) => a.semesterNumber - b.semesterNumber);

  // Group and filter courses across all semesters based on repeat attempt policy
  const policy = settings.repeatPolicy || 'latest_attempt';
  const allCoursesWithSem: { course: AcademicCourse; semNum: number }[] = [];

  sortedSemesters.forEach((sem) => {
    sem.courses.forEach((c) => {
      if (!c.isExcluded && c.credits > 0) {
        allCoursesWithSem.push({ course: c, semNum: sem.semesterNumber });
      }
    });
  });

  // Normalize subject key for deduplication
  const getSubjectKey = (c: AcademicCourse) => {
    if (c.subjectCode && c.subjectCode.trim().length > 0) {
      return c.subjectCode.trim().toUpperCase();
    }
    return c.subjectName.trim().toLowerCase();
  };

  const selectedCoursesMap = new Map<string, { course: AcademicCourse; semNum: number }>();

  if (policy === 'all_attempts') {
    allCoursesWithSem.forEach((item, index) => {
      selectedCoursesMap.set(`item_${index}`, item);
    });
  } else if (policy === 'highest_attempt') {
    allCoursesWithSem.forEach((item) => {
      const key = getSubjectKey(item.course);
      const existing = selectedCoursesMap.get(key);
      if (!existing || item.course.gradePoint > existing.course.gradePoint) {
        selectedCoursesMap.set(key, item);
      }
    });
  } else {
    // 'latest_attempt' (default): Later semester attempt overwrites earlier attempt
    allCoursesWithSem.forEach((item) => {
      const key = getSubjectKey(item.course);
      selectedCoursesMap.set(key, item);
    });
  }

  let totalApplicableCredits = 0;
  let totalCreditsEarned = 0;
  let totalGradePoints = 0;

  selectedCoursesMap.forEach(({ course }) => {
    totalApplicableCredits += course.credits;
    totalGradePoints += course.credits * course.gradePoint;
    if (course.isCleared || course.gradePoint >= settings.passingMinPoints) {
      totalCreditsEarned += course.credits;
    }
  });

  const overallCgpa = totalApplicableCredits > 0 ? Number((totalGradePoints / totalApplicableCredits).toFixed(2)) : 0.0;

  // Progressive Semester History (GPA & progressive CGPA trend over time)
  const history: SemesterGpaTrend[] = [];
  const progressiveCourseMap = new Map<string, AcademicCourse>();

  sortedSemesters.forEach((sem) => {
    // Update running progressive course pool for trend
    sem.courses.forEach((c) => {
      if (!c.isExcluded && c.credits > 0) {
        const key = getSubjectKey(c);
        if (policy === 'highest_attempt') {
          const prev = progressiveCourseMap.get(key);
          if (!prev || c.gradePoint > prev.gradePoint) {
            progressiveCourseMap.set(key, c);
          }
        } else if (policy === 'all_attempts') {
          progressiveCourseMap.set(`${key}_sem${sem.semesterNumber}`, c);
        } else {
          // latest attempt
          progressiveCourseMap.set(key, c);
        }
      }
    });

    let runningCredits = 0;
    let runningPoints = 0;
    progressiveCourseMap.forEach((c) => {
      runningCredits += c.credits;
      runningPoints += c.credits * c.gradePoint;
    });

    const cgpaToDate = runningCredits > 0 ? Number((runningPoints / runningCredits).toFixed(2)) : sem.gpa;

    history.push({
      semesterNumber: sem.semesterNumber,
      semesterLabel: sem.semesterLabel || `Semester ${sem.semesterNumber}`,
      gpa: sem.gpa,
      cgpaToDate,
      creditsEarned: sem.earnedCredits,
      totalCredits: sem.totalCredits,
    });
  });

  const currentSemesterGpa = sortedSemesters.length > 0 ? sortedSemesters[sortedSemesters.length - 1].gpa : 0.0;

  return {
    studentId,
    currentSemesterGpa,
    overallCgpa,
    totalSemesters: sortedSemesters.filter((s) => s.courses.length > 0).length,
    totalCreditsEarned: Number(totalCreditsEarned.toFixed(2)),
    totalApplicableCredits: Number(totalApplicableCredits.toFixed(2)),
    totalGradePoints: Number(totalGradePoints.toFixed(2)),
    settings,
    semesters: sortedSemesters,
    history,
  };
}

// ====================================================================
// Database & Service Integration
// ====================================================================

/**
 * Fetch student grading scheme and calculation settings
 */
export async function getStudentGpaSettings(studentId?: string): Promise<StudentGpaSettings> {
  let uid = studentId;
  if (!uid) {
    const { data: authData } = await supabase.auth.getUser();
    uid = authData.user?.id;
  }

  if (!uid) {
    return { ...DEFAULT_GPA_SETTINGS, studentId: '' };
  }

  // 1. Try local cache
  const cached = await getLocalCache<StudentGpaSettings>(`${GPA_SETTINGS_CACHE_KEY}${uid}`);

  // 2. Try Supabase
  try {
    const { data, error } = await supabase
      .from('student_gpa_settings')
      .select('*')
      .eq('student_id', uid)
      .maybeSingle();

    if (!error && data) {
      const settings: StudentGpaSettings = {
        studentId: uid,
        gradingSchemeId: (data.grading_scheme_id as GradingSchemeId) || 'anna_univ_10',
        gradingSchemeName: data.grading_scheme_name || 'Anna University 10-Point Scale',
        maxGradePoint: Number(data.max_grade_point) || 10.0,
        passingMinPoints: Number(data.passing_min_points) || 6.0,
        repeatPolicy: data.repeat_policy || 'latest_attempt',
        customGrades: Array.isArray(data.custom_grades) ? data.custom_grades : [],
        updatedAt: data.updated_at,
      };
      await setLocalCache(`${GPA_SETTINGS_CACHE_KEY}${uid}`, settings);
      return settings;
    }
  } catch (err) {
    console.warn('Notice loading GPA settings from Supabase:', err);
  }

  return cached || { ...DEFAULT_GPA_SETTINGS, studentId: uid };
}

/**
 * Save student grading scheme and calculation settings
 */
export async function saveStudentGpaSettings(
  settings: Partial<StudentGpaSettings>,
  studentId?: string
): Promise<{ success: boolean; data?: StudentGpaSettings; error?: string }> {
  let uid = studentId || settings.studentId;
  if (!uid) {
    const { data: authData } = await supabase.auth.getUser();
    uid = authData.user?.id;
  }

  if (!uid) {
    return { success: false, error: 'User not authenticated' };
  }

  const current = await getStudentGpaSettings(uid);
  const updated: StudentGpaSettings = {
    ...current,
    ...settings,
    studentId: uid,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save local cache
  await setLocalCache(`${GPA_SETTINGS_CACHE_KEY}${uid}`, updated);

  // 2. Save Supabase
  try {
    const { error } = await supabase
      .from('student_gpa_settings')
      .upsert(
        {
          student_id: uid,
          grading_scheme_id: updated.gradingSchemeId,
          grading_scheme_name: updated.gradingSchemeName,
          max_grade_point: updated.maxGradePoint,
          passing_min_points: updated.passingMinPoints,
          repeat_policy: updated.repeatPolicy,
          custom_grades: updated.customGrades,
          updated_at: updated.updatedAt,
        },
        { onConflict: 'student_id' }
      );

    if (error) {
      console.warn('Notice saving GPA settings to Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('Exception saving GPA settings:', err);
  }

  return { success: true, data: updated };
}

/**
 * Fetch all academic records, semesters, courses, and complete summary for student
 */
export async function getStudentAcademicSummary(studentId?: string): Promise<OverallAcademicSummary> {
  let uid = studentId;
  if (!uid) {
    const { data: authData } = await supabase.auth.getUser();
    uid = authData.user?.id;
  }

  if (!uid) {
    return {
      studentId: '',
      currentSemesterGpa: 0,
      overallCgpa: 0,
      totalSemesters: 0,
      totalCreditsEarned: 0,
      totalApplicableCredits: 0,
      totalGradePoints: 0,
      settings: DEFAULT_GPA_SETTINGS,
      semesters: [],
      history: [],
    };
  }

  const settings = await getStudentGpaSettings(uid);

  // Check local cache
  const localSemesters = (await getLocalCache<SemesterAcademicSummary[]>(`${GPA_SEMESTERS_CACHE_KEY}${uid}`)) || [];

  try {
    // 1. Fetch semesters from Supabase
    const { data: semRows, error: semErr } = await supabase
      .from('student_academic_semesters')
      .select('*')
      .eq('student_id', uid)
      .order('semester_number', { ascending: true });

    if (!semErr && semRows && semRows.length > 0) {
      // 2. Fetch courses for student
      const { data: courseRows } = await supabase
        .from('student_academic_courses')
        .select('*')
        .eq('student_id', uid)
        .order('semester_number', { ascending: true });

      const coursesBySem = new Map<number, AcademicCourse[]>();
      (courseRows || []).forEach((c: any) => {
        const list = coursesBySem.get(c.semester_number) || [];
        list.push({
          id: c.id,
          studentId: uid,
          semesterId: c.semester_id,
          semesterNumber: c.semester_number,
          subjectId: c.subject_id,
          subjectCode: c.subject_code,
          subjectName: c.subject_name,
          credits: Number(c.credits) || 0,
          grade: c.grade,
          gradePoint: Number(c.grade_point) || 0,
          isArrear: Boolean(c.is_arrear),
          isCleared: Boolean(c.is_cleared),
          isExcluded: Boolean(c.is_excluded),
          attemptNumber: Number(c.attempt_number) || 1,
          notes: c.notes,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        });
        coursesBySem.set(c.semester_number, list);
      });

      const loadedSemesters: SemesterAcademicSummary[] = semRows.map((s: any) => {
        const courses = coursesBySem.get(s.semester_number) || [];
        return calculateSemesterSummary(s.semester_number, courses, settings, s.id, s.academic_year);
      });

      await setLocalCache(`${GPA_SEMESTERS_CACHE_KEY}${uid}`, loadedSemesters);
      return calculateOverallAcademicSummary(uid, loadedSemesters, settings);
    }
  } catch (err) {
    console.warn('Notice loading academic records from Supabase:', err);
  }

  // Fallback to local cache
  return calculateOverallAcademicSummary(uid, localSemesters, settings);
}

/**
 * Save results for a specific semester
 */
export async function saveSemesterResults(
  semesterNumber: number,
  courses: AcademicCourse[],
  studentId?: string,
  academicYear?: string
): Promise<{ success: boolean; summary?: SemesterAcademicSummary; error?: string }> {
  let uid = studentId;
  if (!uid) {
    const { data: authData } = await supabase.auth.getUser();
    uid = authData.user?.id;
  }

  if (!uid) {
    return { success: false, error: 'User not authenticated' };
  }

  if (semesterNumber < 1 || semesterNumber > 12) {
    return { success: false, error: 'Invalid semester number (must be 1 - 12)' };
  }

  const settings = await getStudentGpaSettings(uid);
  const calculatedSem = calculateSemesterSummary(semesterNumber, courses, settings, undefined, academicYear);

  // 1. Update local cache
  const localSemesters = (await getLocalCache<SemesterAcademicSummary[]>(`${GPA_SEMESTERS_CACHE_KEY}${uid}`)) || [];
  const existingIdx = localSemesters.findIndex((s) => s.semesterNumber === semesterNumber);
  if (existingIdx >= 0) {
    localSemesters[existingIdx] = calculatedSem;
  } else {
    localSemesters.push(calculatedSem);
  }
  localSemesters.sort((a, b) => a.semesterNumber - b.semesterNumber);
  await setLocalCache(`${GPA_SEMESTERS_CACHE_KEY}${uid}`, localSemesters);

  // 2. Persist to Supabase
  try {
    // A. Upsert semester record
    const { data: semData, error: semErr } = await supabase
      .from('student_academic_semesters')
      .upsert(
        {
          student_id: uid,
          semester_number: semesterNumber,
          semester_label: calculatedSem.semesterLabel,
          academic_year: academicYear || null,
          gpa: calculatedSem.gpa,
          total_credits: calculatedSem.totalCredits,
          earned_credits: calculatedSem.earnedCredits,
          total_points: calculatedSem.totalGradePoints,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,semester_number' }
      )
      .select('id')
      .single();

    if (!semErr && semData) {
      const semesterId = semData.id;

      // B. Delete existing course rows for this semester to prevent duplicates
      await supabase
        .from('student_academic_courses')
        .delete()
        .eq('student_id', uid)
        .eq('semester_number', semesterNumber);

      // C. Insert fresh course rows
      if (calculatedSem.courses.length > 0) {
        const insertRows = calculatedSem.courses.map((c) => ({
          student_id: uid,
          semester_id: semesterId,
          semester_number: semesterNumber,
          subject_id: c.subjectId || null,
          subject_code: c.subjectCode || null,
          subject_name: c.subjectName,
          credits: c.credits,
          grade: c.grade,
          grade_point: c.gradePoint,
          is_arrear: Boolean(c.isArrear),
          is_cleared: Boolean(c.isCleared),
          is_excluded: Boolean(c.isExcluded),
          attempt_number: c.attemptNumber || 1,
          notes: c.notes || null,
        }));

        const { error: insErr } = await supabase
          .from('student_academic_courses')
          .insert(insertRows);

        if (insErr) {
          console.warn('Notice inserting academic courses:', insErr.message);
        }
      }
    }
  } catch (err: any) {
    console.warn('Exception persisting semester results:', err);
  }

  return { success: true, summary: calculatedSem };
}

/**
 * Delete semester records after user confirmation
 */
export async function deleteSemesterResults(
  semesterNumber: number,
  studentId?: string
): Promise<{ success: boolean; error?: string }> {
  let uid = studentId;
  if (!uid) {
    const { data: authData } = await supabase.auth.getUser();
    uid = authData.user?.id;
  }

  if (!uid) {
    return { success: false, error: 'User not authenticated' };
  }

  // 1. Update local cache
  const localSemesters = (await getLocalCache<SemesterAcademicSummary[]>(`${GPA_SEMESTERS_CACHE_KEY}${uid}`)) || [];
  const filtered = localSemesters.filter((s) => s.semesterNumber !== semesterNumber);
  await setLocalCache(`${GPA_SEMESTERS_CACHE_KEY}${uid}`, filtered);

  // 2. Delete from Supabase
  try {
    await supabase
      .from('student_academic_courses')
      .delete()
      .eq('student_id', uid)
      .eq('semester_number', semesterNumber);

    await supabase
      .from('student_academic_semesters')
      .delete()
      .eq('student_id', uid)
      .eq('semester_number', semesterNumber);
  } catch (err) {
    console.warn('Exception deleting semester records:', err);
  }

  return { success: true };
}

/**
 * Import registered curriculum subjects for a given semester
 */
export async function importCurriculumSubjects(
  semesterNumber: number,
  studentId?: string
): Promise<AcademicCourse[]> {
  let uid = studentId;
  if (!uid) {
    const { data: authData } = await supabase.auth.getUser();
    uid = authData.user?.id;
  }

  const generatedCourses: AcademicCourse[] = [];

  try {
    // 1. Fetch subjects matching this semester
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, subject_code, subject_name, credits, semester')
      .eq('semester', semesterNumber)
      .order('subject_name', { ascending: true });

    (subjectsData || []).forEach((s: any) => {
      generatedCourses.push({
        id: `draft_${s.id}_${Date.now()}`,
        studentId: uid || '',
        semesterNumber,
        subjectId: s.id,
        subjectCode: s.subject_code,
        subjectName: s.subject_name,
        credits: Number(s.credits) || 3.0,
        grade: '',
        gradePoint: 0,
        isArrear: false,
        isCleared: false,
        isExcluded: false,
        attemptNumber: 1,
      });
    });

    // 2. Fetch student's arrear subjects registered for earlier semesters
    if (uid) {
      const { data: arrearRows } = await supabase
        .from('student_subjects')
        .select(`
          subject_id,
          type,
          status,
          subjects (
            id,
            subject_code,
            subject_name,
            credits,
            semester
          )
        `)
        .eq('student_id', uid)
        .eq('type', 'arrear');

      (arrearRows || []).forEach((row: any) => {
        const s = row.subjects;
        if (s && s.semester < semesterNumber && row.status !== 'passed') {
          // Check if already in list
          const exists = generatedCourses.some((c) => c.subjectId === s.id);
          if (!exists) {
            generatedCourses.push({
              id: `arrear_${s.id}_${Date.now()}`,
              studentId: uid || '',
              semesterNumber,
              subjectId: s.id,
              subjectCode: s.subject_code,
              subjectName: `${s.subject_name} (Arrear)`,
              credits: Number(s.credits) || 3.0,
              grade: '',
              gradePoint: 0,
              isArrear: true,
              isCleared: false,
              isExcluded: false,
              attemptNumber: 2,
              notes: `Arrear from Semester ${s.semester}`,
            });
          }
        }
      });
    }
  } catch (err) {
    console.warn('Notice importing curriculum subjects:', err);
  }

  return generatedCourses;
}
