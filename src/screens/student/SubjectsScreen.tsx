import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import SubjectCard from '@/components/cards/SubjectCard';

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

export default function SubjectsScreen() {
  const { user } = useAuth();

  const [currentSubjects, setCurrentSubjects] = useState<Subject[]>([]);
  const [arrearSubjects, setArrearSubjects] = useState<Subject[]>([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const CURRENT_SEMESTER = 5;

  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user]);

  async function loadSubjects() {
    if (!user) return;

    setLoading(true);

    try {
      // -----------------------------------------
      // 1. CURRENT SEMESTER SUBJECTS
      // -----------------------------------------

      const { data: currentData, error: currentError } =
        await supabase
          .from('subjects')
          .select('*')
          .eq('semester', CURRENT_SEMESTER)
          .order('subject_name', { ascending: true });

      if (currentError) {
        console.error(
          'Error loading current subjects:',
          currentError
        );

        setLoading(false);
        return;
      }

      // -----------------------------------------
      // 2. GET STUDENT'S ARREAR SUBJECT IDs
      // -----------------------------------------

      const { data: studentSubjectData, error: studentError } =
        await supabase
          .from('student_subjects')
          .select('subject_id')
          .eq('student_id', user.id)
          .eq('type', 'arrear');

      if (studentError) {
        console.error(
          'Error loading arrear subjects:',
          studentError
        );

        setLoading(false);
        return;
      }

      const arrearIds = (studentSubjectData ?? []).map(
        (item) => item.subject_id
      );

      // -----------------------------------------
      // 3. GET ACTUAL ARREAR SUBJECT DETAILS
      // -----------------------------------------

      let arrearData: SupabaseSubject[] = [];

      if (arrearIds.length > 0) {
        const { data, error: arrearError } =
          await supabase
            .from('subjects')
            .select('*')
            .in('id', arrearIds)
            .order('semester', { ascending: true });

        if (arrearError) {
          console.error(
            'Error loading arrear subject details:',
            arrearError
          );

          setLoading(false);
          return;
        }

        arrearData = (data ?? []) as SupabaseSubject[];
      }

      // -----------------------------------------
      // 4. CONVERT DATABASE SUBJECT
      // -----------------------------------------

      const convertSubject = (
        subject: SupabaseSubject
      ): Subject => ({
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
      });

      // -----------------------------------------
      // 5. SET DATA
      // -----------------------------------------

      setCurrentSubjects(
        ((currentData ?? []) as SupabaseSubject[]).map(
          convertSubject
        )
      );

      setArrearSubjects(
        arrearData.map(convertSubject)
      );

    } catch (error) {
      console.error('Unexpected error:', error);
    }

    setLoading(false);
  }

  // -----------------------------------------
  // SEARCH
  // -----------------------------------------

  const filteredCurrentSubjects = currentSubjects.filter(
    (subject) =>
      `${subject.name} ${subject.code}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const filteredArrearSubjects = arrearSubjects.filter(
    (subject) =>
      `${subject.name} ${subject.code}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <>
      <AppHeader title="Subjects" showBack />

      <PageContainer showBottomNav>
        <div className="pt-4 pb-6">

          {/* Search */}
          <div className="relative mb-6">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500">
                Loading subjects...
              </p>
            </div>
          ) : (
            <>
              {/* -------------------------------- */}
              {/* CURRENT SEMESTER */}
              {/* -------------------------------- */}

              <div className="mb-8">

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      My Subjects
                    </h2>

                    <p className="text-xs text-gray-500 mt-1">
                      Semester {CURRENT_SEMESTER}
                    </p>
                  </div>

                  <span className="text-xs font-medium text-blue-600">
                    {filteredCurrentSubjects.length} Subjects
                  </span>
                </div>

                {filteredCurrentSubjects.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl">
                    <p className="text-sm text-gray-500">
                      No current semester subjects found.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCurrentSubjects.map(
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

              {/* -------------------------------- */}
              {/* ARREAR SUBJECTS */}
              {/* -------------------------------- */}

              <div>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Arrear Subjects
                    </h2>

                    <p className="text-xs text-gray-500 mt-1">
                      Subjects you need to clear
                    </p>
                  </div>

                  <span className="text-xs font-medium text-red-500">
                    {filteredArrearSubjects.length} Arrears
                  </span>
                </div>

                {filteredArrearSubjects.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl">
                    <p className="text-sm font-medium text-gray-700">
                      No arrear subjects
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Add your arrears from the Arrear Subjects page.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredArrearSubjects.map(
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
            </>
          )}

        </div>
      </PageContainer>

      <BottomNav />
    </>
  );
}