export type Role = 'student' | 'teacher';

export interface Unit {
  id: string;
  number: number;
  title: string;
  description: string;
  pdfs: Pdf[];
  videos: Video[];
  importantQuestions: string[];
  assignments: string[];
  completed: boolean;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  credits: number;
  description: string;
  color: string;
  icon: string;
  progress: number;
  units: Unit[];
  isArrear?: boolean;
}

export interface Pdf {
  id: string;
  title: string;
  size: string;
  pages: number;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
  file_url?: string;
  bookmarked: boolean;
}

export interface Video {
  id: string;
  title: string;
  channel?: string;
  duration?: string;
  thumbnail?: string;
  url: string;
  bookmarked?: boolean;
  subject_id?: string;
  unit_id?: string;
  teacher_id?: string;
  is_playlist?: boolean;
  video_type?: 'video' | 'playlist';
  created_at?: string;
}

export interface Assignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  unit_id?: string | null;
  title: string;
  description?: string | null;
  due_date: string;
  due_time?: string | null;
  max_marks?: number;
  attachment_url?: string | null;
  created_at?: string;
  updated_at?: string;
  subject?: {
    id: string;
    subject_code: string;
    subject_name: string;
  };
  unit?: {
    id: string;
    unit_number: number;
    unit_title: string;
  };
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  edition?: string;
  description?: string;
  cover_url?: string;
  file_url?: string;
  purchase_link?: string;
  subject_id?: string;
  unit_id?: string;
  teacher_id?: string;
  created_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  date?: string;
  subject?: string;
  subject_id?: string;
  teacher_id?: string;
  priority: 'high' | 'medium' | 'low';
  read?: boolean;
  created_at?: string;
  teacher_name?: string;
  subject_name?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'announcement' | 'material' | 'assignment' | 'general';
  read: boolean;
}

export interface SemesterData {
  id: number;
  name: string;
  subjects: Subject[];
}

export interface StudentViewRecord {
  studentId: string;
  studentName: string;
  registerNumber: string;
  department?: string;
  semester?: number;
  viewed: boolean;
  viewedAt?: string;
}

export interface PdfTrackingStats {
  pdfId: string;
  pdfTitle: string;
  subjectName: string;
  unitTitle: string;
  totalStudents: number;
  viewedCount: number;
  notViewedCount: number;
  viewedPercentage: number;
  viewedStudents: StudentViewRecord[];
  notViewedStudents: StudentViewRecord[];
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed' | 'missed';

export interface StudyTask {
  id: string;
  student_id: string;
  plan_id?: string | null;
  subject_id?: string | null;
  unit_id?: string | null;
  title: string;
  description?: string | null;
  study_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM or HH:MM:SS
  end_time: string; // HH:MM or HH:MM:SS
  priority: TaskPriority;
  status: TaskStatus;
  reminder_enabled: boolean;
  reminder_minutes_before: number;
  notification_id?: string | null;
  is_ai_generated?: boolean;
  created_at?: string;
  updated_at?: string;
  // Populated fields
  subject?: {
    id: string;
    subject_code: string;
    subject_name: string;
  };
  unit?: {
    id: string;
    unit_number: number;
    unit_title: string;
  };
}

export interface Exam {
  id: string;
  subject_id: string;
  teacher_id: string;
  exam_title: string;
  exam_date: string; // YYYY-MM-DD
  exam_time?: string | null; // HH:MM or HH:MM:SS
  location?: string | null;
  instructions?: string | null;
  created_at?: string;
  updated_at?: string;
  // Populated fields
  subject?: {
    id: string;
    subject_code: string;
    subject_name: string;
    semester?: number;
    department?: string;
  };
  days_remaining?: number;
  formatted_date?: string;
}

export interface HydrationLog {
  id: string;
  student_id: string;
  amount_ml: number;
  logged_at: string;
  log_date: string;
}

export interface StudentNotificationSettings {
  id?: string;
  student_id: string;
  hydration_enabled: boolean;
  hydration_interval_minutes: number;
  hydration_start_time: string; // HH:MM or HH:MM:SS
  hydration_end_time: string; // HH:MM or HH:MM:SS
  hydration_daily_goal_ml: number;
  exam_reminders_enabled: boolean;
  study_task_reminders_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudyPlan {
  id: string;
  student_id: string;
  title: string;
  description?: string | null;
  target_exam_ids?: string[];
  available_hours_per_day: number;
  preferred_start_time: string;
  preferred_end_time: string;
  difficulty_preferences?: Record<string, 'easy' | 'medium' | 'hard'>;
  status: 'active' | 'completed' | 'archived';
  ai_summary?: string | null;
  created_at?: string;
  updated_at?: string;
  tasks?: StudyTask[];
  total_tasks_count?: number;
  completed_tasks_count?: number;
}

export interface AISessionItem {
  subject_id?: string;
  subject_name: string;
  unit_id?: string;
  unit_title?: string;
  title: string;
  description: string;
  start_time: string; // "09:00"
  end_time: string; // "10:30"
  priority: TaskPriority;
  type: 'learning' | 'revision' | 'practice';
}

export interface AIDaySchedule {
  date: string; // YYYY-MM-DD
  day_name: string; // "Monday", "Tuesday", etc.
  sessions: AISessionItem[];
}

export interface AIProposedPlan {
  title: string;
  description: string;
  summary: string;
  available_hours_per_day: number;
  daily_schedules: AIDaySchedule[];
}

export interface StudentUnitProgress {
  id?: string;
  student_id: string;
  unit_id: string;
  completed: boolean;
  completed_at?: string;
  created_at?: string;
}

export interface UnitProgressItem {
  id: string;
  unitNumber: number;
  title: string;
  description?: string | null;
  completed: boolean;
  completedAt?: string | null;
  pdfCount?: number;
  videoCount?: number;
  assignmentCount?: number;
}

export interface SubjectProgressSummary {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  department: string;
  isArrear?: boolean;
  totalUnits: number;
  completedUnits: number;
  remainingUnits: number;
  percentage: number;
  units: UnitProgressItem[];
}

export interface StudentOverallProgress {
  studentId: string;
  totalSubjects: number;
  totalUnits: number;
  completedUnits: number;
  remainingUnits: number;
  overallPercentage: number;
  pdfViewsCount: number;
  subjects: SubjectProgressSummary[];
}

export interface CohortStudentProgress {
  studentId: string;
  studentName: string;
  registerNumber: string;
  department?: string;
  semester?: number;
  totalUnits: number;
  completedUnits: number;
  remainingUnits: number;
  percentage: number;
  incompleteUnits: { id: string; unitNumber: number; title: string }[];
  completedUnitsList: { id: string; unitNumber: number; title: string; completedAt?: string }[];
}

export interface TeacherCohortProgress {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  department: string;
  totalUnits: number;
  totalStudents: number;
  averagePercentage: number;
  fullyCompletedStudentsCount: number;
  students: CohortStudentProgress[];
}

export type FocusSessionStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'manually_ended'
  | 'emergency_ended';

export interface FocusSession {
  id: string;
  student_id: string;
  subject_id?: string | null;
  unit_id?: string | null;
  planned_duration_minutes: number;
  actual_duration_seconds: number;
  status: FocusSessionStatus;
  started_at: string;
  ended_at?: string | null;
  created_at?: string;
  updated_at?: string;
  subject?: {
    id: string;
    subject_code: string;
    subject_name: string;
  };
  unit?: {
    id: string;
    unit_number: number;
    unit_title?: string;
    title?: string;
  };
}

export interface ActiveFocusState {
  sessionId?: string;
  plannedMinutes: number;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitTitle?: string;
  startTimestamp: number;
  targetEndTimestamp: number;
  isPaused: boolean;
  pausedRemainingSeconds: number;
  isIntentionalNavigation: boolean;
  leftAppTimestamp?: number | null;
}



