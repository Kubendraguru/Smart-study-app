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
  channel: string;
  duration: string;
  thumbnail: string;
  url: string;
  bookmarked: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
  subject: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
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
