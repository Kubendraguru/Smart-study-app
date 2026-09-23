import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  AlertCircle,
  GraduationCap,
  Loader2,
} from 'lucide-react';

import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import {
  getStudentArrearSubjects,
  getEligibleArrearSubjects,
  addArrearSubjects,
  removeArrearSubject,
  ArrearSubjectItem,
} from '@/service/arrears';
import { getProfile } from '@/service/auth';

export default function ArrearSubjectsScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentSemester, setCurrentSemester] = useState(5);
  const [selectedArrears, setSelectedArrears] = useState<ArrearSubjectItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<ArrearSubjectItem[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [activeSemesterFilter, setActiveSemesterFilter] = useState<number | 'all'>('all');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get student's current semester from profile
      const profile = await getProfile(user.id);
      const studentSem = profile?.semester || 5;
      setCurrentSemester(studentSem);

      // 2. Fetch student's active arrears & eligible previous semester subjects
      const [arrears, eligible] = await Promise.all([
        getStudentArrearSubjects(user.id),
        getEligibleArrearSubjects({ maxSemester: studentSem }),
      ]);

      setSelectedArrears(arrears);
      setAvailableSubjects(eligible);
      setSelectedToAdd([]);
    } catch (err) {
      console.error('Error loading arrear subjects data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelectToAdd = (subjectId: string) => {
    setSelectedToAdd((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleAddSelected = async () => {
    if (selectedToAdd.length === 0) return;

    setSaving(true);
    setMessage('');
    try {
      await addArrearSubjects(selectedToAdd, user?.id);
      setMessage(`${selectedToAdd.length} arrear subject(s) added successfully!`);
      setSelectedToAdd([]);
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to add arrear subjects.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveArrear = async (subject: ArrearSubjectItem) => {
    if (
      !window.confirm(
        `Are you sure you want to remove "${subject.subject_code}: ${subject.subject_name}" from your arrear subjects?`
      )
    ) {
      return;
    }

    try {
      await removeArrearSubject(subject.id, user?.id);
      setSelectedArrears((prev) => prev.filter((s) => s.id !== subject.id));
      setMessage(`Removed "${subject.subject_code}" from your arrears.`);
      setTimeout(() => setMessage(''), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to remove arrear subject.');
    }
  };

  // Filter available subjects: exclude already selected arrears
  const unselectedAvailable = availableSubjects.filter(
    (s) => !selectedArrears.some((a) => a.id === s.id)
  );

  const filteredAvailable = unselectedAvailable.filter((s) => {
    if (activeSemesterFilter === 'all') return true;
    return s.semester === activeSemesterFilter;
  });

  const previousSemesters = Array.from(
    { length: Math.max(0, currentSemester - 1) },
    (_, i) => i + 1
  );

  return (
    <>
      <AppHeader title="My Arrear Subjects" showBack />

      <PageContainer showBottomNav>
        <div className="pt-4 pb-12">
          {/* Header Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Clear Backlog Courses</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Select previous-semester subjects to access lecture notes, videos, playlists, and assignments.
              </p>
            </div>
          </motion.div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-sm font-semibold mb-6"
            >
              <Check size={18} className="text-emerald-600" />
              {message}
            </motion.div>
          )}

          {/* Section 1: Selected Arrear Subjects */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Selected Arrear Subjects ({selectedArrears.length})
              </h3>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-red-600" />
                Loading arrear subjects...
              </div>
            ) : selectedArrears.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 p-6">
                <AlertCircle size={36} className="mx-auto text-gray-400 mb-2" />
                <h4 className="text-sm font-bold text-gray-800 mb-1">No Arrear Subjects Selected</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Browse previous semester subjects below to add them to your study dashboard.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedArrears.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 hover:border-red-300 transition-all flex items-center justify-between gap-3"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => navigate(`/subject/${item.id}`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={20} className="text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 px-2 py-0.5 rounded-md">
                            {item.subject_code}
                          </span>
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md">
                            Sem {item.semester}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm truncate">
                          {item.subject_name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {item.credits} Credits · {item.department}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/subject/${item.id}`)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        Open Course
                      </button>
                      <button
                        onClick={() => handleRemoveArrear(item)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                        title="Remove from arrears"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Browse Previous Semester Subjects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Browse Previous Semesters ({unselectedAvailable.length} Available)
              </h3>
            </div>

            {/* Semester Filter Tabs */}
            {previousSemesters.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setActiveSemesterFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeSemesterFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Previous Semesters
                </button>
                {previousSemesters.map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setActiveSemesterFilter(sem)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      activeSemesterFilter === sem
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Semester {sem}
                  </button>
                ))}
              </div>
            )}

            {filteredAvailable.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-500 p-4">
                {unselectedAvailable.length === 0
                  ? 'All eligible previous semester subjects have already been added.'
                  : 'No subjects found for this semester filter.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAvailable.map((subject) => {
                  const isSelected = selectedToAdd.includes(subject.id);
                  return (
                    <div
                      key={subject.id}
                      onClick={() => toggleSelectToAdd(subject.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {isSelected ? <Check size={14} /> : <Plus size={14} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-gray-900">
                            {subject.subject_code}
                          </span>
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            Sem {subject.semester}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-800 text-sm truncate">
                          {subject.subject_name}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {subject.credits} Credits · {subject.department}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Submit Selection Button */}
            {selectedToAdd.length > 0 && (
              <div className="mt-6 sticky bottom-20 z-10">
                <Button fullWidth size="lg" onClick={handleAddSelected} disabled={saving}>
                  {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Plus size={18} className="mr-2" />}
                  Add {selectedToAdd.length} Selected Arrear Subject{selectedToAdd.length > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
        </div>
      </PageContainer>

      <BottomNav />
    </>
  );
}