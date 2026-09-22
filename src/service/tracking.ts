import { supabase } from '@/lib/supabase';
import type { PdfTrackingStats, StudentViewRecord } from '@/types';

/**
 * Record a student viewing a PDF.
 * If the student views the same PDF again, updates viewed_at timestamp instead of creating duplicate records.
 */
export async function recordPdfView(
  pdfId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  if (!pdfId || !studentId) {
    return { success: false, error: 'Missing pdfId or studentId' };
  }

  try {
    const { error } = await supabase.from('pdf_views').upsert(
      {
        pdf_id: pdfId,
        student_id: studentId,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: 'pdf_id,student_id' }
    );

    if (error) {
      console.warn('PDF view tracking notice:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Unexpected error in recordPdfView:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch all available PDFs uploaded by teachers for tracking selection.
 */
export async function getAllTeacherPdfs(): Promise<
  { id: string; title: string; subjectName: string; unitTitle: string; createdAt: string }[]
> {
  try {
    const { data: materials, error } = await supabase
      .from('materials')
      .select('id, title, unit_id, created_at')
      .or('material_type.ilike.pdf,file_url.ilike.%.pdf')
      .order('created_at', { ascending: false });

    if (error || !materials) {
      console.error('Error fetching materials for tracking:', error);
      return [];
    }

    const unitIds = [...new Set(materials.map((m) => m.unit_id).filter(Boolean))];
    let unitsMap: Record<string, { unit_title: string; subject_name: string }> = {};

    if (unitIds.length > 0) {
      const { data: unitsData } = await supabase
        .from('units')
        .select('id, unit_title, subjects(subject_name, subject_code)')
        .in('id', unitIds);

      (unitsData ?? []).forEach((u: any) => {
        unitsMap[u.id] = {
          unit_title: u.unit_title || 'Unit',
          subject_name: u.subjects?.subject_name || u.subjects?.subject_code || 'Subject',
        };
      });
    }

    return materials.map((m) => ({
      id: m.id,
      title: m.title || 'Untitled PDF',
      subjectName: unitsMap[m.unit_id]?.subject_name || 'Subject',
      unitTitle: unitsMap[m.unit_id]?.unit_title || 'Unit',
      createdAt: m.created_at || '',
    }));
  } catch (err) {
    console.error('Unexpected error in getAllTeacherPdfs:', err);
    return [];
  }
}

/**
 * Get comprehensive PDF view tracking statistics for a specific PDF.
 */
export async function getPdfViewTracking(
  pdfId: string
): Promise<{ stats: PdfTrackingStats | null; tableMissing?: boolean; error?: string }> {
  try {
    // 1. Fetch the PDF material
    const { data: material, error: matErr } = await supabase
      .from('materials')
      .select('id, title, unit_id, created_at')
      .eq('id', pdfId)
      .maybeSingle();

    if (matErr || !material) {
      return { stats: null, error: matErr?.message || 'PDF not found' };
    }

    // 2. Fetch Unit and Subject to identify enrolled cohort
    let subjectName = 'Subject';
    let unitTitle = 'Unit';
    let subjectSemester: number | null = null;
    let subjectDepartment: string | null = null;
    let subjectId: string | null = null;

    if (material.unit_id) {
      const { data: unitData } = await supabase
        .from('units')
        .select('id, unit_title, subject_id, subjects(id, subject_name, semester, department)')
        .eq('id', material.unit_id)
        .maybeSingle();

      if (unitData) {
        unitTitle = unitData.unit_title || 'Unit';
        const subj = (unitData as any).subjects;
        if (subj) {
          subjectId = subj.id;
          subjectName = subj.subject_name || 'Subject';
          subjectSemester = subj.semester;
          subjectDepartment = subj.department;
        }
      }
    }

    // 3. Fetch recorded views from pdf_views
    let viewsData: { student_id: string; viewed_at: string }[] = [];
    let tableMissing = false;

    const { data: views, error: viewsErr } = await supabase
      .from('pdf_views')
      .select('student_id, viewed_at')
      .eq('pdf_id', pdfId);

    if (viewsErr) {
      if (viewsErr.code === 'PGRST205' || viewsErr.message?.includes('does not exist')) {
        tableMissing = true;
      } else {
        console.warn('Error reading pdf_views:', viewsErr.message);
      }
    } else {
      viewsData = views ?? [];
    }

    const viewsMap = new Map<string, string>();
    viewsData.forEach((v) => {
      viewsMap.set(v.student_id, v.viewed_at);
    });

    // 4. Fetch regular enrolled students (matching semester and department, role = 'student')
    let enrolledStudentsMap = new Map<
      string,
      { id: string; full_name: string; register_number: string; department?: string; semester?: number }
    >();

    let profileQuery = supabase
      .from('profiles')
      .select('id, full_name, register_number, department, semester, role')
      .eq('role', 'student');

    if (subjectSemester) {
      profileQuery = profileQuery.eq('semester', subjectSemester);
    }
    if (subjectDepartment) {
      profileQuery = profileQuery.eq('department', subjectDepartment);
    }

    // Helper to identify and exclude test/placeholder accounts from live tracking
    const isTestAccount = (name?: string, reg?: string) => {
      const n = (name || '').trim().toLowerCase();
      const r = (reg || '').trim().toLowerCase();
      return (
        n === 'student a' ||
        n === 'teacher b' ||
        n.startsWith('test student') ||
        r === 'reg001' ||
        r === 'test'
      );
    };

    const { data: regularStudents } = await profileQuery;
    (regularStudents ?? []).forEach((s) => {
      if (isTestAccount(s.full_name, s.register_number)) return;
      enrolledStudentsMap.set(s.id, {
        id: s.id,
        full_name: s.full_name || 'Student',
        register_number: s.register_number || 'N/A',
        department: s.department,
        semester: s.semester,
      });
    });

    // 5. Fetch arrear students enrolled in this subject
    if (subjectId) {
      const { data: arrearData } = await supabase
        .from('student_subjects')
        .select('student_id, profiles(id, full_name, register_number, department, semester, role)')
        .eq('subject_id', subjectId)
        .eq('type', 'arrear');

      (arrearData ?? []).forEach((item: any) => {
        const p = item.profiles;
        if (p && p.role === 'student' && !enrolledStudentsMap.has(p.id) && !isTestAccount(p.full_name, p.register_number)) {
          enrolledStudentsMap.set(p.id, {
            id: p.id,
            full_name: p.full_name || 'Student',
            register_number: p.register_number || 'N/A',
            department: p.department,
            semester: p.semester,
          });
        }
      });
    }

    // 6. Also include any students who have recorded views but weren't in the filter
    const viewedStudentIds = Array.from(viewsMap.keys());
    const missingViewedIds = viewedStudentIds.filter((id) => !enrolledStudentsMap.has(id));

    if (missingViewedIds.length > 0) {
      const { data: additionalProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, register_number, department, semester, role')
        .in('id', missingViewedIds)
        .eq('role', 'student');

      (additionalProfiles ?? []).forEach((p) => {
        if (isTestAccount(p.full_name, p.register_number)) return;
        enrolledStudentsMap.set(p.id, {
          id: p.id,
          full_name: p.full_name || '',
          register_number: p.register_number || '',
          department: p.department,
          semester: p.semester,
        });
      });
    }

    // 7. Partition students into viewed and not viewed
    const viewedStudents: StudentViewRecord[] = [];
    const notViewedStudents: StudentViewRecord[] = [];

    enrolledStudentsMap.forEach((student) => {
      const viewedAt = viewsMap.get(student.id);
      if (viewedAt) {
        viewedStudents.push({
          studentId: student.id,
          studentName: student.full_name,
          registerNumber: student.register_number,
          department: student.department,
          semester: student.semester,
          viewed: true,
          viewedAt,
        });
      } else {
        notViewedStudents.push({
          studentId: student.id,
          studentName: student.full_name,
          registerNumber: student.register_number,
          department: student.department,
          semester: student.semester,
          viewed: false,
        });
      }
    });

    // Sort viewed students by newest view first
    viewedStudents.sort((a, b) => {
      const timeA = a.viewedAt ? new Date(a.viewedAt).getTime() : 0;
      const timeB = b.viewedAt ? new Date(b.viewedAt).getTime() : 0;
      return timeB - timeA;
    });

    // Sort not viewed students alphabetically
    notViewedStudents.sort((a, b) => a.studentName.localeCompare(b.studentName));

    const totalStudents = enrolledStudentsMap.size;
    const viewedCount = viewedStudents.length;
    const notViewedCount = notViewedStudents.length;
    const viewedPercentage =
      totalStudents > 0 ? Math.round((viewedCount / totalStudents) * 100) : 0;

    return {
      stats: {
        pdfId: material.id,
        pdfTitle: material.title || 'Untitled PDF',
        subjectName,
        unitTitle,
        totalStudents,
        viewedCount,
        notViewedCount,
        viewedPercentage,
        viewedStudents,
        notViewedStudents,
      },
      tableMissing,
    };
  } catch (err: any) {
    console.error('Unexpected error in getPdfViewTracking:', err);
    return { stats: null, error: err?.message };
  }
}
