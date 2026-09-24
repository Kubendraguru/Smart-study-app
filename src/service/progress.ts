import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  StudentOverallProgress,
  SubjectProgressSummary,
  UnitProgressItem,
  TeacherCohortProgress,
  CohortStudentProgress,
} from '@/types';

const COMPLETED_UNITS_CACHE_PREFIX = '@smart_study_completed_units_';

// Local storage helper for caching completed units
async function getLocalCompletedUnits(studentId: string): Promise<Set<string>> {
  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(`${COMPLETED_UNITS_CACHE_PREFIX}${studentId}`);
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(`${COMPLETED_UNITS_CACHE_PREFIX}${studentId}`);
    }
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function saveLocalCompletedUnit(studentId: string, unitId: string, completed: boolean): Promise<void> {
  try {
    const current = await getLocalCompletedUnits(studentId);
    if (completed) {
      current.add(unitId);
    } else {
      current.delete(unitId);
    }
    const json = JSON.stringify(Array.from(current));
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`${COMPLETED_UNITS_CACHE_PREFIX}${studentId}`, json);
    }
    await AsyncStorage.setItem(`${COMPLETED_UNITS_CACHE_PREFIX}${studentId}`, json);
  } catch (err) {
    console.warn('Error saving local completed unit:', err);
  }
}

/**
 * Fetch set of completed unit IDs for a student (combines Supabase and local cache)
 */
export async function getCompletedUnitIds(studentId?: string): Promise<Set<string>> {
  try {
    let uid = studentId;
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }

    if (!uid) return new Set();

    const localSet = await getLocalCompletedUnits(uid);

    const { data, error } = await supabase
      .from('student_unit_progress')
      .select('unit_id, completed')
      .eq('student_id', uid)
      .eq('completed', true);

    if (error) {
      return localSet;
    }

    const combinedSet = new Set(localSet);
    (data || []).forEach((row: any) => {
      combinedSet.add(row.unit_id);
    });

    return combinedSet;
  } catch (err) {
    console.error('getCompletedUnitIds exception:', err);
    return new Set();
  }
}

/**
 * Check if a single unit is completed by a student
 */
export async function isUnitCompleted(unitId: string, studentId?: string): Promise<boolean> {
  try {
    let uid = studentId;
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }

    if (!uid || !unitId) return false;

    const localSet = await getLocalCompletedUnits(uid);
    if (localSet.has(unitId)) return true;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unitId);
    if (!isUuid) return localSet.has(unitId);

    const { data, error } = await supabase
      .from('student_unit_progress')
      .select('completed')
      .eq('student_id', uid)
      .eq('unit_id', unitId)
      .maybeSingle();

    if (error) {
      return localSet.has(unitId);
    }

    return Boolean(data?.completed);
  } catch {
    return false;
  }
}

/**
 * Toggle or set unit completion state for a student
 */
export async function toggleUnitCompletion(
  unitId: string,
  completed: boolean,
  studentId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let uid = studentId;
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }

    if (!uid) return { success: false, error: 'User not authenticated' };
    if (!unitId) return { success: false, error: 'Unit ID is required' };

    // Save to local cache first
    await saveLocalCompletedUnit(uid, unitId, completed);

    // Only attempt database upsert if unitId is a valid UUID format
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unitId);
    if (!isUuid) {
      return { success: true };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('student_unit_progress')
      .upsert(
        {
          student_id: uid,
          unit_id: unitId,
          completed,
          completed_at: now,
          updated_at: now,
        },
        { onConflict: 'student_id,unit_id' }
      );

    if (error) {
      console.warn('Notice saving unit progress in Supabase:', error.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error('toggleUnitCompletion exception:', err);
    return { success: true }; // Local cache succeeded
  }
}

/**
 * Fetch comprehensive learning progress for a student
 */
export async function getStudentOverallProgress(studentId?: string): Promise<StudentOverallProgress> {
  let uid = studentId;
  if (!uid) {
    const { data: authData } = await supabase.auth.getUser();
    uid = authData.user?.id;
  }

  const emptyResult: StudentOverallProgress = {
    studentId: uid || '',
    totalSubjects: 0,
    totalUnits: 0,
    completedUnits: 0,
    remainingUnits: 0,
    overallPercentage: 0,
    pdfViewsCount: 0,
    subjects: [],
  };

  if (!uid) return emptyResult;

  try {
    // 1. Fetch student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('semester, department')
      .eq('id', uid)
      .maybeSingle();

    const studentSem = profile?.semester || 5;

    // 2. Fetch current semester subjects
    const { data: currentSubjects } = await supabase
      .from('subjects')
      .select('id, subject_code, subject_name, semester, department, credits')
      .eq('semester', studentSem)
      .order('subject_name', { ascending: true });

    // 3. Fetch student arrear subjects
    let arrearSubjects: any[] = [];
    try {
      const { data: studentArrears } = await supabase
        .from('student_subjects')
        .select(`
          subject_id,
          type,
          status,
          subjects (
            id,
            subject_code,
            subject_name,
            semester,
            department,
            credits
          )
        `)
        .eq('student_id', uid)
        .eq('type', 'arrear');

      arrearSubjects = (studentArrears ?? [])
        .filter((item: any) => item.status !== 'passed')
        .map((item: any) => item.subjects)
        .filter((s: any) => s && s.semester < studentSem);
    } catch {
      // Ignore arrear table error if not loaded
    }

    // Merge unique subjects
    const subjectMap = new Map<
      string,
      {
        id: string;
        subject_code: string;
        subject_name: string;
        semester: number;
        department: string;
        isArrear: boolean;
      }
    >();

    (currentSubjects || []).forEach((s: any) => {
      subjectMap.set(s.id, {
        id: s.id,
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        semester: s.semester,
        department: s.department,
        isArrear: false,
      });
    });

    arrearSubjects.forEach((s: any) => {
      subjectMap.set(s.id, {
        id: s.id,
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        semester: s.semester,
        department: s.department,
        isArrear: true,
      });
    });

    // If no subjects found for current semester, fetch all subjects as fallback
    if (subjectMap.size === 0) {
      const { data: allSubjectsFallback } = await supabase
        .from('subjects')
        .select('id, subject_code, subject_name, semester, department, credits')
        .order('semester', { ascending: true })
        .limit(6);

      (allSubjectsFallback || []).forEach((s: any) => {
        subjectMap.set(s.id, {
          id: s.id,
          subject_code: s.subject_code,
          subject_name: s.subject_name,
          semester: s.semester,
          department: s.department,
          isArrear: false,
        });
      });
    }

    const allSubjectList = Array.from(subjectMap.values());
    const subjectIds = allSubjectList.map((s) => s.id);

    if (subjectIds.length === 0) {
      return emptyResult;
    }

    // 4. Fetch all units for these subjects
    const { data: unitsData, error: unitsError } = await supabase
      .from('units')
      .select('id, subject_id, unit_number, unit_title, description')
      .in('subject_id', subjectIds)
      .order('unit_number', { ascending: true });

    if (unitsError) {
      console.error('Error fetching units in getStudentOverallProgress:', unitsError);
    }

    const unitsBySubject = new Map<string, any[]>();
    (unitsData || []).forEach((u: any) => {
      const list = unitsBySubject.get(u.subject_id) || [];
      list.push(u);
      unitsBySubject.set(u.subject_id, list);
    });

    // 5. Fetch completed unit records for this student
    const completedUnitSet = await getCompletedUnitIds(uid);

    // 6. Fetch PDF views count for this student
    let pdfViewsCount = 0;
    try {
      const { count, error: countErr } = await supabase
        .from('pdf_views')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', uid);

      if (!countErr && typeof count === 'number') {
        pdfViewsCount = count;
      }
    } catch {
      // Ignore pdf_views table missing error
    }

    // 7. Calculate subject summaries based strictly on teacher-uploaded units
    let totalAllUnits = 0;
    let totalAllCompleted = 0;

    const subjectsSummary: SubjectProgressSummary[] = allSubjectList.map((subj) => {
      const rawUnits = unitsBySubject.get(subj.id) || [];
      let completedUnits = 0;

      const unitProgressItems: UnitProgressItem[] = rawUnits.map((u: any) => {
        const isDone =
          completedUnitSet.has(u.id) ||
          completedUnitSet.has(`${subj.id}-unit-${u.unit_number}`);

        if (isDone) completedUnits += 1;

        return {
          id: u.id,
          unitNumber: u.unit_number,
          title: u.unit_title || u.title || `Unit ${u.unit_number}`,
          description: u.description || null,
          completed: isDone,
        };
      });

      const totalUnits = unitProgressItems.length;
      const remainingUnits = Math.max(0, totalUnits - completedUnits);
      const percentage = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

      totalAllUnits += totalUnits;
      totalAllCompleted += completedUnits;

      return {
        subjectId: subj.id,
        subjectCode: subj.subject_code,
        subjectName: subj.subject_name,
        semester: subj.semester,
        department: subj.department,
        isArrear: subj.isArrear,
        totalUnits,
        completedUnits,
        remainingUnits,
        percentage,
        units: unitProgressItems,
      };
    });

    const totalRemaining = Math.max(0, totalAllUnits - totalAllCompleted);
    const overallPercentage = totalAllUnits > 0 ? Math.round((totalAllCompleted / totalAllUnits) * 100) : 0;

    return {
      studentId: uid,
      totalSubjects: allSubjectList.length,
      totalUnits: totalAllUnits,
      completedUnits: totalAllCompleted,
      remainingUnits: totalRemaining,
      overallPercentage,
      pdfViewsCount,
      subjects: subjectsSummary,
    };
  } catch (err) {
    console.error('getStudentOverallProgress exception:', err);
    return emptyResult;
  }
}

/**
 * Fetch teacher cohort progress for a given subject
 */
export async function getTeacherCohortProgress(subjectId: string): Promise<TeacherCohortProgress | null> {
  if (!subjectId) return null;

  try {
    // 1. Fetch subject information
    const { data: subjectData, error: subjErr } = await supabase
      .from('subjects')
      .select('id, subject_code, subject_name, semester, department')
      .eq('id', subjectId)
      .single();

    if (subjErr || !subjectData) {
      console.error('Subject not found for tracking:', subjErr);
      return null;
    }

    // 2. Fetch all teacher-uploaded units for this subject
    const { data: unitsData, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number, unit_title, description')
      .eq('subject_id', subjectId)
      .order('unit_number', { ascending: true });

    if (unitsError) {
      console.error('Error fetching units in getTeacherCohortProgress:', unitsError);
    }

    const rawUnits = unitsData || [];
    const subjectUnits = rawUnits.map((u: any) => ({
      id: u.id,
      unitNumber: u.unit_number,
      title: u.unit_title || u.title || `Unit ${u.unit_number}`,
    }));

    const totalUnits = subjectUnits.length;
    const unitIds = subjectUnits.map((u) => u.id);

    // 3. Fetch cohort students
    let regularQuery = supabase
      .from('profiles')
      .select('id, full_name, register_number, department, semester')
      .eq('role', 'student')
      .eq('semester', subjectData.semester);

    if (subjectData.department && subjectData.department !== 'ALL') {
      regularQuery = regularQuery.eq('department', subjectData.department);
    }

    const { data: regularStudents } = await regularQuery;

    // B. Arrear students who enrolled in this subject
    const { data: arrearRows } = await supabase
      .from('student_subjects')
      .select(`
        student_id,
        profiles (
          id,
          full_name,
          register_number,
          department,
          semester
        )
      `)
      .eq('subject_id', subjectId)
      .eq('type', 'arrear');

    const studentsMap = new Map<string, { id: string; full_name: string; register_number: string; department: string; semester: number }>();

    (regularStudents || []).forEach((s: any) => {
      studentsMap.set(s.id, {
        id: s.id,
        full_name: s.full_name || 'Unnamed Student',
        register_number: s.register_number || 'N/A',
        department: s.department || '',
        semester: s.semester || subjectData.semester,
      });
    });

    (arrearRows || []).forEach((row: any) => {
      const p = row.profiles;
      if (p) {
        studentsMap.set(p.id, {
          id: p.id,
          full_name: p.full_name || 'Unnamed Student',
          register_number: p.register_number || 'N/A',
          department: p.department || '',
          semester: p.semester || 1,
        });
      }
    });

    const enrolledStudents = Array.from(studentsMap.values());
    const studentIds = enrolledStudents.map((s) => s.id);

    const isUuid = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    const validDbUnitIds = unitIds.filter(isUuid);

    // 4. Fetch all student_unit_progress records for these students and these units
    let progressRecords: any[] = [];
    if (studentIds.length > 0 && validDbUnitIds.length > 0) {
      const { data: progData } = await supabase
        .from('student_unit_progress')
        .select('student_id, unit_id, completed, completed_at')
        .in('student_id', studentIds)
        .in('unit_id', validDbUnitIds)
        .eq('completed', true);

      progressRecords = progData || [];
    }

    // Map completed unit IDs per student
    const studentCompletions = new Map<string, Set<string>>();
    progressRecords.forEach((r: any) => {
      const set = studentCompletions.get(r.student_id) || new Set<string>();
      set.add(r.unit_id);
      studentCompletions.set(r.student_id, set);
    });

    // 5. Build CohortStudentProgress list
    let totalPercentages = 0;
    let fullyCompletedCount = 0;

    const cohortStudents: CohortStudentProgress[] = enrolledStudents.map((student) => {
      const doneSet = studentCompletions.get(student.id) || new Set<string>();
      const completedUnits = doneSet.size;
      const remainingUnits = Math.max(0, totalUnits - completedUnits);
      const percentage = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

      if (totalUnits > 0 && completedUnits === totalUnits) {
        fullyCompletedCount += 1;
      }
      totalPercentages += percentage;

      const completedUnitsList = subjectUnits
        .filter((u) => doneSet.has(u.id))
        .map((u) => ({ id: u.id, unitNumber: u.unitNumber, title: u.title }));

      const incompleteUnits = subjectUnits
        .filter((u) => !doneSet.has(u.id))
        .map((u) => ({ id: u.id, unitNumber: u.unitNumber, title: u.title }));

      return {
        studentId: student.id,
        studentName: student.full_name,
        registerNumber: student.register_number,
        department: student.department,
        semester: student.semester,
        totalUnits,
        completedUnits,
        remainingUnits,
        percentage,
        completedUnitsList,
        incompleteUnits,
      };
    });

    // Sort students: lowest percentage first to highlight students needing attention
    cohortStudents.sort((a, b) => a.percentage - b.percentage || a.studentName.localeCompare(b.studentName));

    const totalStudents = enrolledStudents.length;
    const averagePercentage = totalStudents > 0 ? Math.round(totalPercentages / totalStudents) : 0;

    return {
      subjectId: subjectData.id,
      subjectCode: subjectData.subject_code,
      subjectName: subjectData.subject_name,
      semester: subjectData.semester,
      department: subjectData.department,
      totalUnits,
      totalStudents,
      averagePercentage,
      fullyCompletedStudentsCount: fullyCompletedCount,
      students: cohortStudents,
    };
  } catch (err) {
    console.error('getTeacherCohortProgress exception:', err);
    return null;
  }
}
