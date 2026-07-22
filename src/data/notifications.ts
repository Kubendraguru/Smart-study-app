import type { Notification } from '@/types';

export const notifications: Notification[] = [
  {
    id: 'n1',
    title: 'New Material Uploaded',
    message: 'Prof. Rajesh Kumar uploaded "Database Design - Complete Notes" for DBMS.',
    date: '2 hours ago',
    type: 'material',
    read: false,
  },
  {
    id: 'n2',
    title: 'Assignment Due Soon',
    message: 'AI Assignment on Machine Learning Basics is due in 3 days.',
    date: '5 hours ago',
    type: 'assignment',
    read: false,
  },
  {
    id: 'n3',
    title: 'New Announcement',
    message: 'OS Lab Session has been rescheduled to Friday 3 PM.',
    date: '1 day ago',
    type: 'announcement',
    read: false,
  },
  {
    id: 'n4',
    title: 'New Video Added',
    message: 'A new video "JavaScript Essentials - Full Explanation" was added to Web Essentials.',
    date: '2 days ago',
    type: 'material',
    read: true,
  },
  {
    id: 'n5',
    title: 'Welcome to Study Hub',
    message: 'Explore your subjects, units, and study materials all in one place!',
    date: '3 days ago',
    type: 'general',
    read: true,
  },
];
