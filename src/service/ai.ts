import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  attachmentName?: string;
  attachmentType?: 'pdf' | 'image';
}

export interface AttachedMaterial {
  name: string;
  type: 'pdf' | 'image';
  size?: number;
  previewUrl?: string;
  file?: File;
  storageUrl?: string;
  base64Data?: string;
  mimeType?: string;
}

export interface StudentStudyMaterial {
  id: string;
  title: string;
  subjectName: string;
  unitTitle: string;
  fileUrl: string;
  createdAt?: string;
}

export interface AiChatPayload {
  message: string;
  history: { role: 'user' | 'model'; text: string }[];
  attachment?: {
    name: string;
    type: 'pdf' | 'image';
    data?: string; // base64 string without data prefix
    mimeType?: string;
    url?: string;
  };
}

export interface AiResponse {
  success: boolean;
  answer?: string;
  error?: string;
  isConfigMissing?: boolean;
}

export interface PdfMaterialItem {
  id: string;
  title: string;
  fileUrl: string;
  createdAt?: string;
}

export interface UnitWithPdfs {
  unitId: string;
  unitTitle: string;
  unitNumber: number;
  pdfs: PdfMaterialItem[];
}

export interface SubjectWithUnits {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  semester?: number;
  department?: string;
  isEnrolled?: boolean;
  units: UnitWithPdfs[];
}

/**
 * Fetch all teacher uploaded PDFs grouped subject-wise and unit-wise.
 */
export async function fetchSubjectWisePdfs(
  userId?: string
): Promise<SubjectWithUnits[]> {
  try {
    // 1. Fetch all PDF materials uploaded by teachers
    const { data: materials, error: matErr } = await supabase
      .from('materials')
      .select('id, title, unit_id, file_url, created_at')
      .or('material_type.ilike.pdf,file_url.ilike.%.pdf')
      .order('created_at', { ascending: false });

    if (matErr || !materials || materials.length === 0) {
      console.warn('No materials found or error loading materials:', matErr?.message);
      return [];
    }

    const unitIds = [...new Set(materials.map((m) => m.unit_id).filter(Boolean))];
    if (unitIds.length === 0) return [];

    // 2. Fetch units and their parent subjects
    const { data: unitsData, error: unitsErr } = await supabase
      .from('units')
      .select('id, unit_title, unit_number, subject_id, subjects(id, subject_name, subject_code, semester, department)')
      .in('id', unitIds)
      .order('unit_number', { ascending: true });

    if (unitsErr || !unitsData) {
      console.error('Error loading units for materials:', unitsErr?.message);
      return [];
    }

    const unitsMap = new Map<string, any>();
    unitsData.forEach((u) => unitsMap.set(u.id, u));

    // 3. Check student's enrolled semester/department if userId is provided
    let studentSemester: number | null = null;
    let studentDept: string | null = null;
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('semester, department')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        studentSemester = profile.semester;
        studentDept = profile.department;
      }
    }

    // 4. Group materials: Subject -> Unit -> PDFs
    const subjectsMap = new Map<string, SubjectWithUnits>();

    materials.forEach((m) => {
      const unit = unitsMap.get(m.unit_id);
      const subject = unit?.subjects;
      if (!subject) return;

      if (!subjectsMap.has(subject.id)) {
        const isEnrolled =
          Boolean(studentSemester && subject.semester === studentSemester) &&
          (!studentDept || !subject.department || subject.department === studentDept);

        subjectsMap.set(subject.id, {
          subjectId: subject.id,
          subjectName: subject.subject_name || 'Subject',
          subjectCode: subject.subject_code || '',
          semester: subject.semester,
          department: subject.department,
          isEnrolled,
          units: [],
        });
      }

      const subjectGroup = subjectsMap.get(subject.id)!;
      let unitGroup = subjectGroup.units.find((u) => u.unitId === unit.id);

      if (!unitGroup) {
        unitGroup = {
          unitId: unit.id,
          unitTitle: unit.unit_title || `Unit ${unit.unit_number || ''}`,
          unitNumber: unit.unit_number || 1,
          pdfs: [],
        };
        subjectGroup.units.push(unitGroup);
      }

      unitGroup.pdfs.push({
        id: m.id,
        title: m.title || 'Untitled PDF',
        fileUrl: m.file_url,
        createdAt: m.created_at,
      });
    });

    const result = Array.from(subjectsMap.values());

    // Sort units within each subject by unit_number
    result.forEach((subj) => {
      subj.units.sort((a, b) => a.unitNumber - b.unitNumber);
    });

    // Sort subjects: enrolled first, then alphabetically
    result.sort((a, b) => {
      if (a.isEnrolled && !b.isEnrolled) return -1;
      if (!a.isEnrolled && b.isEnrolled) return 1;
      return a.subjectName.localeCompare(b.subjectName);
    });

    return result;
  } catch (err) {
    console.error('Unexpected error in fetchSubjectWisePdfs:', err);
    return [];
  }
}

/**
 * Fetch available study PDF materials for the current student.
 */
export async function fetchStudentStudyMaterials(
  userId?: string
): Promise<StudentStudyMaterial[]> {
  const grouped = await fetchSubjectWisePdfs(userId);
  const flat: StudentStudyMaterial[] = [];
  grouped.forEach((s) => {
    s.units.forEach((u) => {
      u.pdfs.forEach((p) => {
        flat.push({
          id: p.id,
          title: p.title,
          subjectName: s.subjectName,
          unitTitle: u.unitTitle,
          fileUrl: p.fileUrl,
          createdAt: p.createdAt,
        });
      });
    });
  });
  return flat;
}

/**
 * Convert a File object into a base64 string (without the data URL prefix).
 */
export async function convertFileToBase64(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      const base64 = commaIdx >= 0 ? result.substring(commaIdx + 1) : result;
      resolve({ base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch a remote URL and convert it to base64.
 */
export async function convertUrlToBase64(
  url: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        const base64 = commaIdx >= 0 ? result.substring(commaIdx + 1) : result;
        resolve({ base64, mimeType: blob.type || 'application/pdf' });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not fetch file for base64 conversion:', err);
    return null;
  }
}

/**
 * Send chat message to the secure Supabase Edge Function backend.
 * Never exposes the AI API key to the client.
 */
export async function sendAiChatMessage(payload: AiChatPayload): Promise<AiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: payload,
    });

    if (error) {
      // Check if Edge Function is not yet deployed on Supabase project
      if (
        error.message?.includes('Failed to send a request') ||
        error.message?.includes('FunctionsFetchError') ||
        error.message?.includes('404')
      ) {
        return {
          success: false,
          isConfigMissing: true,
          error:
            'The AI Assistant Edge Function is not yet deployed in your Supabase project. Deploy the `ai-assistant` function and configure your GEMINI_API_KEY in Supabase secrets to enable real AI responses.',
        };
      }

      return {
        success: false,
        error: error.message || 'Unable to connect to AI Assistant. Please try again.',
      };
    }

    if (data?.error) {
      return {
        success: false,
        error: data.error,
        isConfigMissing: data.isConfigMissing,
      };
    }

    return {
      success: true,
      answer: data?.answer || 'No response generated. Please ask a different question.',
    };
  } catch (err: any) {
    console.error('Error calling AI service:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while contacting AI Assistant.',
    };
  }
}
