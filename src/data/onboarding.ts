import { BookOpen, Video, BrainCircuit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'All Your Subjects in One Place',
    description: 'Access notes, PDFs, and study materials for every subject organized by semester and unit.',
    icon: BookOpen,
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    id: 2,
    title: 'Learn with Videos',
    description: 'Watch curated YouTube tutorials handpicked by your professors for each topic.',
    icon: Video,
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    id: 3,
    title: 'AI Study Assistant',
    description: 'Get instant answers to your doubts with our AI-powered study companion.',
    icon: BrainCircuit,
    gradient: 'from-blue-600 to-indigo-500',
  },
];
