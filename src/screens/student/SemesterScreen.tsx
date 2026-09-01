import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, BookOpen } from 'lucide-react';

import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import SubjectCard from '@/components/cards/SubjectCard';
import ProgressBar from '@/components/ui/ProgressBar';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Subject } from '@/types';

type SupabaseSubject = {
  id: string;
  subject_code: string;
  subject_name: string;
  semester: number;
  department: string;
  credits: number;
  description: string | null;
};

export default function SemesterScreen() {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user]);

  async function loadSubjects() {
    if (!user) return;

    setLoading(true);

    try {
      /*
       * 1. Get current semester subjects
       */
      const { data: currentSubjects, error: currentError } =
        await supabase
          .from('subjects')
          .select('*')
          .eq('semester', 5)
          .order('subject_name', { ascending: true });

      if (currentError) {
        console.error(
          'Error loading current semester subjects:',
          currentError
        );
        setLoading(false);
        return;
      }

      /*
       * 2. Get this student's arrear subject IDs
       */
      const { data: arrearData, error: arrearError } =
        await supabase
          .from('student_subjects')
          .select('subject_id')
          .eq('student_id', user.id)
          .eq('type', 'arrear');

      if (arrearError) {
        console.error(
          'Error loading arrear subjects:',
          arrearError
        );
        setLoading(false);
        return;
      }

      const arrearIds =
        (arrearData ?? []).map(
          (item) => item.subject_id
        );

      /*
       * 3. Get actual subject details for arrears
       */
      let arrearSubjects: SupabaseSubject[] = [];

      if (arrearIds.length > 0) {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .in('id', arrearIds)
          .order('semester', { ascending: true });

        if (error) {
          console.error(
            'Error loading arrear subject details:',
            error
          );
        } else {
          arrearSubjects = data ?? [];
        }
      }

      /*
       * 4. Combine current semester + arrears
       */
      const allSubjects = [
        ...(currentSubjects ?? []),
        ...arrearSubjects,
      ];

      /*
       * Prevent duplicate subjects
       */
      const uniqueSubjects = Array.from(
        new Map(
          allSubjects.map((subject) => [
            subject.id,
            subject,
          ])
        ).values()
      );

      /*
       * 5. Convert Supabase data to app Subject type
       */
      const formattedSubjects: Subject[] =
        uniqueSubjects.map((subject) => ({
          id: subject.id,
          code: subject.subject_code,
          name: subject.subject_name,
          semester: subject.semester,
          credits: subject.credits,
          description: subject.description ?? '',
          color: 'blue',
          icon: 'book-open',
          progress: 0,
          units: [],
        }));

      setSubjects(formattedSubjects);
    } catch (error) {
      console.error('Unexpected error:', error);
    }

    setLoading(false);
  }

  const overallProgress =
    subjects.length > 0
      ? Math.round(
          subjects.reduce(
            (sum, subject) => sum + subject.progress,
            0
          ) / subjects.length
        )
      : 0;

  const currentSemesterSubjects = subjects.filter(
    (subject) => subject.semester === 5
  );

  const arrearSubjects = subjects.filter(
    (subject) => subject.semester !== 5
  );

  const totalUnits = subjects.reduce(
    (sum, subject) => sum + subject.units.length,
    0
  );

  return (
    <>
      <AppHeader title="Semester 5" showBack />

      <PageContainer showBottomNav>
        <div className="pt-4 pb-6">

          {/* Semester Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/60 border border-gray-100 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar
                    size={16}
                    className="text-blue-600"
                  />

                  <span className="text-xs font-medium text-gray-500">
                    Academic Year 2024-25
                  </span>
                </div>

                <h2 className="text-lg font-bold text-gray-900">
                  Semester 5
                </h2>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {overallProgress}%
                </p>

                <p className="text-xs text-gray-500">
                  Overall
                </p>
              </div>
            </div>

            <ProgressBar
              value={overallProgress}
              showLabel
            />

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">

              <div className="flex items-center gap-1.5">
                <BookOpen
                  size={14}
                  className="text-gray-400"
                />

                <span className="text-xs text-gray-600">
                  {currentSemesterSubjects.length} Current
                </span>
              </div>

              <div>
                <span className="text-xs text-gray-600">
                  {arrearSubjects.length} Arrears
                </span>
              </div>

              <div>
                <span className="text-xs text-gray-600">
                  {totalUnits} Units
                </span>
              </div>

            </div>
          </motion.div>

          {/* Loading */}
          {loading ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500">
                Loading subjects...
              </p>
            </div>
          ) : (
            <>
              {/* Current Semester */}
              <div className="mb-6">

                <h3 className="text-base font-bold text-gray-900 mb-3">
                  Semester 5 Subjects
                </h3>

                {currentSemesterSubjects.length === 0 ? (
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
                    <p className="text-sm text-gray-500">
                      No Semester 5 subjects found.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentSemesterSubjects.map(
                      (subject, i) => (
                        <SubjectCard
                          key={subject.id}
                          subject={subject}
                          index={i}
                        />
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Arrear Subjects */}
              {arrearSubjects.length > 0 && (
                <div className="mb-6">

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Arrear Subjects
                      </h3>

                      <p className="text-xs text-gray-500 mt-1">
                        Subjects from previous semesters
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                      {arrearSubjects.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {arrearSubjects.map(
                      (subject, i) => (
                        <div key={subject.id}>

                          <div className="mb-1 px-1">
                            <span className="text-[11px] font-medium text-gray-400">
                              Semester {subject.semester}
                            </span>
                          </div>

                          <SubjectCard
                            subject={subject}
                            index={i}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </PageContainer>

      <BottomNav />
    </>
  );
}