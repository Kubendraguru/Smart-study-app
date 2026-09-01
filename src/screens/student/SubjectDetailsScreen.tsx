import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  BookOpen,
  FileText,
  Video,
  HelpCircle,
  ClipboardList,
} from 'lucide-react';

import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import UnitCard from '@/components/cards/UnitCard';
import ProgressBar from '@/components/ui/ProgressBar';
import Badge from '@/components/ui/Badge';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type SupabaseSubject = {
  id: string;
  subject_code: string;
  subject_name: string;
  semester: number;
  department: string;
  credits: number;
  description: string | null;
};

type Subject = {
  id: string;
  code: string;
  name: string;
  semester: number;
  credits: number;
  description: string;
  color: string;
  icon: string;
  progress: number;
  units: any[];
  isArrear?: boolean;
};

const colorMap: Record<
  string,
  {
    bg: string;
    text: string;
    bar: string;
  }
> = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    bar: 'bg-blue-600',
  },

  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    bar: 'bg-emerald-600',
  },

  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    bar: 'bg-amber-500',
  },

  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    bar: 'bg-rose-500',
  },

  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    bar: 'bg-violet-500',
  },

  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    bar: 'bg-cyan-500',
  },
};

export default function SubjectDetailsScreen() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubject();
  }, [subjectId, user]);

  async function loadSubject() {
    if (!subjectId || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // ----------------------------------------
      // 1. Get subject from Supabase
      // ----------------------------------------

      const { data: subjectData, error: subjectError } =
        await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .single();

      if (subjectError || !subjectData) {
        console.error(
          'Error loading subject:',
          subjectError
        );

        setSubject(null);
        return;
      }

      const dbSubject =
        subjectData as SupabaseSubject;

      // ----------------------------------------
      // 2. Check whether this is an arrear
      // ----------------------------------------

      const { data: arrearData, error: arrearError } =
        await supabase
          .from('student_subjects')
          .select('subject_id, type')
          .eq('student_id', user.id)
          .eq('subject_id', subjectId)
          .eq('type', 'arrear')
          .maybeSingle();

      if (arrearError) {
        console.error(
          'Error checking arrear:',
          arrearError
        );
      }

      const isArrear =
        !!arrearData &&
        dbSubject.semester < 5;

      // ----------------------------------------
      // 3. Format subject
      // ----------------------------------------
      const { data: unitData, error: unitError } = await supabase
  .from('units')
  .select('*')
  .eq('subject_id', subjectId)
  .order('unit_number', { ascending: true });

if (unitError) {
  console.error('Error loading units:', unitError);
}
      const formattedSubject: Subject = {
        id: dbSubject.id,
        code: dbSubject.subject_code,
        name: dbSubject.subject_name,
        semester: dbSubject.semester,
        credits: dbSubject.credits,
        description: dbSubject.description ?? '',
        color: isArrear ? 'rose' : 'blue',
        icon: 'book-open',
        progress: 0,
       units: (unitData ?? []).map((unit: any) => ({
  id: unit.id,
  number: unit.unit_number,
  title: unit.title,
  description: unit.description ?? '',
  pdfs: [],
  videos: [],
  importantQuestions: [],
  assignments: [],
  completed: false,
})), 
        isArrear,
      };

      setSubject(formattedSubject);
    } catch (error) {
      console.error(
        'Unexpected error loading subject:',
        error
      );

      setSubject(null);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------
  // Loading
  // ----------------------------------------

  if (loading) {
    return (
      <>
        <AppHeader title="Subject" showBack />

        <PageContainer showBottomNav>
          <div className="pt-20 text-center">
            <p className="text-sm text-gray-500">
              Loading subject...
            </p>
          </div>
        </PageContainer>

        <BottomNav />
      </>
    );
  }

  // ----------------------------------------
  // Subject not found
  // ----------------------------------------

  if (!subject) {
    return (
      <>
        <AppHeader title="Subject" showBack />

        <PageContainer showBottomNav>
          <div className="pt-20 text-center">
            <p className="text-sm text-gray-500">
              Subject not found.
            </p>

            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-sm font-semibold text-blue-600"
            >
              Go Back
            </button>
          </div>
        </PageContainer>

        <BottomNav />
      </>
    );
  }

  // ----------------------------------------
  // Colors
  // ----------------------------------------

  const colors =
    colorMap[subject.color] || colorMap.blue;

  const Icon =
    (
      LucideIcons as unknown as Record<
        string,
        LucideIcon
      >
    )[subject.icon] || BookOpen;

  // ----------------------------------------
  // Statistics
  // ----------------------------------------

  const totalPdfs = subject.units.reduce(
    (sum, unit) =>
      sum + (unit.pdfs?.length ?? 0),
    0
  );

  const totalVideos = subject.units.reduce(
    (sum, unit) =>
      sum + (unit.videos?.length ?? 0),
    0
  );

  const totalQuestions = subject.units.reduce(
    (sum, unit) =>
      sum + (unit.importantQuestions?.length ?? 0),
    0
  );

  const totalAssignments = subject.units.reduce(
    (sum, unit) =>
      sum + (unit.assignments?.length ?? 0),
    0
  );

  const stats = [
    {
      label: 'PDFs',
      value: totalPdfs,
      icon: FileText,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },

    {
      label: 'Videos',
      value: totalVideos,
      icon: Video,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },

    {
      label: 'Questions',
      value: totalQuestions,
      icon: HelpCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },

    {
      label: 'Assignments',
      value: totalAssignments,
      icon: ClipboardList,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <>
      <AppHeader
        title={subject.code}
        showBack
      />

      <PageContainer
        showBottomNav
        noPadding
      >
        {/* -------------------------------- */}
        {/* Subject Header */}
        {/* -------------------------------- */}

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-4 pb-6"
        >
          <div className="flex items-start gap-3 mb-4">

            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Icon
                size={28}
                className="text-white"
              />
            </div>

            <div className="flex-1">

              <div className="flex items-center gap-2 mb-1">

                <h1 className="text-xl font-bold text-white">
                  {subject.name}
                </h1>

                {subject.isArrear && (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                    ARREAR
                  </span>
                )}

              </div>

              <div className="flex items-center gap-2">

                <span className="text-xs text-blue-100">
                  Semester {subject.semester}
                </span>

                <span className="text-blue-200">
                  ·
                </span>

                <span className="text-xs text-blue-100">
                  {subject.credits} Credits
                </span>

              </div>

              {subject.isArrear && (
                <p className="text-xs text-red-100 mt-1">
                  Previous Semester {subject.semester}
                </p>
              )}

            </div>
          </div>

          <p className="text-sm text-blue-50 leading-relaxed mb-4">
            {subject.description}
          </p>

          <div>
            <div className="flex justify-between text-xs mb-1.5">

              <span className="text-blue-100">
                Progress
              </span>

              <span className="font-semibold text-white">
                {subject.progress}%
              </span>

            </div>

            <ProgressBar
              value={subject.progress}
              color="bg-white"
              size="sm"
            />
          </div>
        </motion.div>

        {/* -------------------------------- */}
        {/* Statistics */}
        {/* -------------------------------- */}

        <div className="px-4 pt-5">

          <div className="grid grid-cols-4 gap-3 mb-6">

            {stats.map((stat, i) => {
              const StatIcon = stat.icon;

              return (
                <motion.div
                  key={stat.label}
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    delay: i * 0.05,
                  }}
                  className="bg-white rounded-xl p-3 text-center shadow-sm shadow-gray-200/60 border border-gray-100"
                >

                  <div
                    className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}
                  >
                    <StatIcon
                      size={16}
                      className={stat.color}
                    />
                  </div>

                  <p className="text-lg font-bold text-gray-900">
                    {stat.value}
                  </p>

                  <p className="text-[10px] text-gray-500">
                    {stat.label}
                  </p>

                </motion.div>
              );
            })}

          </div>

          {/* -------------------------------- */}
          {/* Units */}
          {/* -------------------------------- */}

          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Units
          </h2>

          {subject.units.length === 0 ? (
            <div className="text-center py-8">

              <p className="text-sm font-medium text-gray-700">
                No units available
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Units and learning materials will appear here.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {subject.units.map(
                (unit, i) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    subjectId={subject.id}
                    index={i}
                  />
                )
              )}

            </div>
          )}

        </div>
      </PageContainer>

      <BottomNav />
    </>
  );
}