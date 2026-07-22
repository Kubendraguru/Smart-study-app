import type { Announcement } from '@/types';

export const announcements: Announcement[] = [
  {
    id: 'a1',
    title: 'DBMS Unit 3 Notes Updated',
    message: 'New notes for Normalization & Integrity have been uploaded. Please review before the next class.',
    date: '2024-01-20',
    subject: 'DBMS',
    priority: 'high',
    read: false,
  },
  {
    id: 'a2',
    title: 'AI Assignment Deadline Extended',
    message: 'The deadline for the Machine Learning Basics assignment has been extended to January 25.',
    date: '2024-01-19',
    subject: 'Artificial Intelligence',
    priority: 'medium',
    read: false,
  },
  {
    id: 'a3',
    title: 'OS Lab Session Rescheduled',
    message: 'The Operating Systems lab session is moved to Friday 3 PM. Room 204, CS Block.',
    date: '2024-01-18',
    subject: 'Operating Systems',
    priority: 'medium',
    read: true,
  },
  {
    id: 'a4',
    title: 'New Video Resources for Web Essentials',
    message: 'Additional YouTube tutorials for JavaScript Essentials are now available.',
    date: '2024-01-17',
    subject: 'IT3401 Web Essentials',
    priority: 'low',
    read: true,
  },
  {
    id: 'a5',
    title: 'Theory of Computation Quiz',
    message: 'A short quiz on Finite Automata will be conducted next Monday. Prepare well!',
    date: '2024-01-16',
    subject: 'Theory of Computation',
    priority: 'high',
    read: true,
  },
];
