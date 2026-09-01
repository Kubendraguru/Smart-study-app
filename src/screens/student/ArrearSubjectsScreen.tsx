import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';

import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type DatabaseSubject = {
  id: string;
  subject_code: string;
  subject_name: string;
  semester: number;
  department: string;
  credits: number;
  description: string | null;
};

export default function ArrearSubjectsScreen() {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<DatabaseSubject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSubjects();
  }, [user]);

  async function loadSubjects() {
    if (!user) return;

    setLoading(true);

    // Get all subjects from previous semesters
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select('*')
      .lt('semester', 5)
      .order('semester', { ascending: true })
      .order('subject_name', { ascending: true });

    if (subjectError) {
      console.error('Error loading subjects:', subjectError);
      setLoading(false);
      return;
    }

    // Get subjects already selected by this student
    const { data: studentSubjectData, error: studentSubjectError } =
      await supabase
        .from('student_subjects')
        .select('subject_id')
        .eq('student_id', user.id);

    if (studentSubjectError) {
      console.error(
        'Error loading student subjects:',
        studentSubjectError
      );
      setLoading(false);
      return;
    }

    setSubjects(subjectData ?? []);

    setExistingSubjects(
      (studentSubjectData ?? []).map(
        (item) => item.subject_id
      )
    );

    setLoading(false);
  }

  function toggleSubject(subjectId: string) {
    if (existingSubjects.includes(subjectId)) {
      return;
    }

    setSelectedSubjects((current) => {
      if (current.includes(subjectId)) {
        return current.filter((id) => id !== subjectId);
      }

      return [...current, subjectId];
    });
  }

  async function addSelectedSubjects() {
    if (!user || selectedSubjects.length === 0) {
      return;
    }

    setSaving(true);
    setMessage('');

    const records = selectedSubjects.map((subjectId) => ({
      student_id: user.id,
      subject_id: subjectId,
      type: 'arrear',
    }));

  const { error } = await supabase
  .from('student_subjects')
  .upsert(records, {
    onConflict: 'student_id,subject_id',
    ignoreDuplicates: true,
  });
  
    if (error) {
      console.error('Error adding arrear subjects:', error);
      setMessage('Failed to add subjects. Please try again.');
      setSaving(false);
      return;
    }

    setExistingSubjects((current) => [
      ...current,
      ...selectedSubjects,
    ]);

    setSelectedSubjects([]);

    setMessage('Arrear subjects added successfully!');

    setSaving(false);
  }

  // Group subjects by semester
  const subjectsBySemester = subjects.reduce(
    (groups, subject) => {
      if (!groups[subject.semester]) {
        groups[subject.semester] = [];
      }

      groups[subject.semester].push(subject);

      return groups;
    },
    {} as Record<number, DatabaseSubject[]>
  );

  return (
    <>
      <AppHeader title="Arrear Subjects" showBack />

      <PageContainer showBottomNav>
        <div className="pt-4 pb-6">

          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Select Your Arrears
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Select subjects from previous semesters that
              you need to clear.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500">
                Loading subjects...
              </p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm font-medium text-gray-700">
                No previous semester subjects found.
              </p>
            </div>
          ) : (
            <div className="space-y-6">

              {Object.entries(subjectsBySemester).map(
                ([semester, semesterSubjects]) => (
                  <div key={semester}>

                    <h3 className="text-sm font-bold text-gray-900 mb-3">
                      Semester {semester}
                    </h3>

                    <div className="space-y-3">
                      {semesterSubjects.map((subject) => {
                        const selected =
                          selectedSubjects.includes(subject.id);

                        const alreadyAdded =
                          existingSubjects.includes(subject.id);

                        return (
                          <button
                            key={subject.id}
                            type="button"
                            onClick={() =>
                              toggleSubject(subject.id)
                            }
                            disabled={alreadyAdded}
                            className={`w-full text-left p-4 rounded-2xl border transition-all ${
                              alreadyAdded
                                ? 'bg-gray-50 border-gray-200 opacity-70'
                                : selected
                                ? 'bg-blue-50 border-blue-500'
                                : 'bg-white border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">

                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  selected || alreadyAdded
                                    ? 'bg-blue-600'
                                    : 'bg-blue-50'
                                }`}
                              >
                                {selected || alreadyAdded ? (
                                  <Check
                                    size={20}
                                    className="text-white"
                                  />
                                ) : (
                                  <Plus
                                    size={20}
                                    className="text-blue-600"
                                  />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm">
                                  {subject.subject_name}
                                </h4>

                                <p className="text-xs text-gray-500 mt-1">
                                  {subject.subject_code}
                                  {' • '}
                                  {subject.credits} Credits
                                </p>
                              </div>

                              {alreadyAdded && (
                                <span className="text-xs font-medium text-green-600">
                                  Added
                                </span>
                              )}

                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              )}

            </div>
          )}

          {message && (
            <div className="mt-5 p-3 rounded-xl bg-green-50 text-green-700 text-sm">
              {message}
            </div>
          )}

          {selectedSubjects.length > 0 && (
            <div className="mt-6">
              <Button
                fullWidth
                size="lg"
                type="button"
                onClick={addSelectedSubjects}
                disabled={saving}
              >
                {saving
                  ? 'Adding...'
                  : `Add ${selectedSubjects.length} Selected Subject${
                      selectedSubjects.length > 1 ? 's' : ''
                    }`}
              </Button>
            </div>
          )}

        </div>
      </PageContainer>

      <BottomNav />
    </>
  );
}