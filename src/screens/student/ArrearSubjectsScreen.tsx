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
  Trophy,
  Sparkles,
  Settings,
  RotateCcw,
  CheckCircle,
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
  markArrearPassed,
  markArrearActive,
  ArrearSubjectItem,
} from '@/service/arrears';
import {
  getArrearMotivationSettings,
  saveArrearMotivationSettings,
} from '@/service/arrearMotivation';
import { getProfile } from '@/service/auth';
import ArrearPassCelebrationModal from '@/components/arrear/ArrearPassCelebrationModal';
import type { ArrearMotivationLanguage, ArrearMotivationSettings } from '@/types';

export default function ArrearSubjectsScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentSemester, setCurrentSemester] = useState(5);
  const [arrearList, setArrearList] = useState<ArrearSubjectItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<ArrearSubjectItem[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [activeSemesterFilter, setActiveSemesterFilter] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'passed'>('active');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Celebration state
  const [celebrationSubject, setCelebrationSubject] = useState<{ name: string; code: string } | null>(null);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [motivationSettings, setMotivationSettings] = useState<ArrearMotivationSettings>({
    enabled: true,
    language: 'both',
    min_interval_minutes: 5,
    max_interval_minutes: 12,
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get student's current semester from profile
      const profile = await getProfile(user.id);
      const studentSem = profile?.semester || 5;
      setCurrentSemester(studentSem);

      // 2. Fetch student's arrears & eligible subjects & settings
      const [arrears, eligible, settings] = await Promise.all([
        getStudentArrearSubjects(user.id, 'all'),
        getEligibleArrearSubjects({ maxSemester: studentSem }),
        getArrearMotivationSettings(),
      ]);

      setArrearList(arrears);
      setAvailableSubjects(eligible);
      setMotivationSettings(settings);
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

  const activeArrears = arrearList.filter((s) => s.status !== 'passed');
  const passedArrears = arrearList.filter((s) => s.status === 'passed');

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
      setArrearList((prev) => prev.filter((s) => s.id !== subject.id));
      setMessage(`Removed "${subject.subject_code}" from your arrears.`);
      setTimeout(() => setMessage(''), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to remove arrear subject.');
    }
  };

  const handleMarkPassed = async (subject: ArrearSubjectItem) => {
    try {
      const res = await markArrearPassed(subject.id, user?.id);
      if (res.success) {
        // Update local state
        setArrearList((prev) =>
          prev.map((s) => (s.id === subject.id ? { ...s, status: 'passed', passed_at: new Date().toISOString() } : s))
        );
        // Trigger celebration
        setCelebrationSubject({ name: subject.subject_name, code: subject.subject_code });
      } else {
        alert(res.error || 'Failed to update arrear status.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to mark as passed.');
    }
  };

  const handleMarkActive = async (subject: ArrearSubjectItem) => {
    try {
      const res = await markArrearActive(subject.id, user?.id);
      if (res.success) {
        setArrearList((prev) =>
          prev.map((s) => (s.id === subject.id ? { ...s, status: 'active', passed_at: null } : s))
        );
        setMessage(`Reactivated "${subject.subject_code}" as an active arrear.`);
        setTimeout(() => setMessage(''), 2500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleSaveSettings = async (newSettings: Partial<ArrearMotivationSettings>) => {
    const updated = await saveArrearMotivationSettings(newSettings);
    setMotivationSettings(updated);
  };

  // Filter available subjects: exclude already registered arrears
  const unselectedAvailable = availableSubjects.filter(
    (s) => !arrearList.some((a) => a.id === s.id)
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
      <AppHeader
        title="My Arrear Subjects"
        showBack
        rightAction={
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Motivation Settings"
          >
            <Sparkles size={16} className="text-amber-500" />
            <span className="hidden sm:inline">Motivation</span>
          </button>
        }
      />

      <PageContainer showBottomNav>
        <div className="pt-4 pb-12">
          {/* Header Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/80 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={24} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Clear Backlog Courses</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Prepare for arrear exams with lecture notes, unit resources, and track your passed courses.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            >
              <Settings size={14} className="text-gray-500" />
              Motivation Settings
            </button>
          </motion.div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-sm font-semibold mb-6 shadow-sm"
            >
              <Check size={18} className="text-emerald-600" />
              {message}
            </motion.div>
          )}

          {/* Section 1: Arrear Subjects Tabs (Active vs Passed) */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'active'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span>Active Backlogs</span>
                  <span className="bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full text-[10px]">
                    {activeArrears.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('passed')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'passed'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span>Cleared & Passed</span>
                  <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full text-[10px]">
                    {passedArrears.length}
                  </span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-red-600" />
                Loading arrear subjects...
              </div>
            ) : activeTab === 'active' ? (
              // Active Backlogs List
              activeArrears.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 p-6">
                  <AlertCircle size={36} className="mx-auto text-gray-400 mb-2" />
                  <h4 className="text-sm font-bold text-gray-800 mb-1">No Active Arrear Subjects</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Browse previous semester subjects below to add courses you need to clear.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeArrears.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 hover:border-red-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleMarkPassed(item)}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                          title="Celebrate & mark as passed"
                        >
                          <Trophy size={14} className="text-emerald-600" />
                          Mark as Passed
                        </button>
                        <button
                          onClick={() => navigate(`/subject/${item.id}`)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          Study Course
                        </button>
                        <button
                          onClick={() => handleRemoveArrear(item)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                          title="Remove from arrears"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              // Cleared / Passed Arrears List
              passedArrears.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 p-6">
                  <Trophy size={36} className="mx-auto text-amber-400 mb-2" />
                  <h4 className="text-sm font-bold text-gray-800 mb-1">No Cleared Arrears Yet</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    When you pass an arrear exam, tap &quot;Mark as Passed&quot; to celebrate and record your achievement here!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {passedArrears.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-emerald-50/40 rounded-2xl p-4 shadow-sm border border-emerald-200 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                          <CheckCircle size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                              {item.subject_code}
                            </span>
                            <span className="text-[10px] font-bold bg-emerald-100/70 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Trophy size={10} /> PASSED
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-900 text-sm truncate">
                            {item.subject_name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Sem {item.semester} · {item.department}
                            {item.passed_at && (
                              <span className="ml-2 text-emerald-600 font-medium">
                                · Cleared on {new Date(item.passed_at).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => setCelebrationSubject({ name: item.subject_name, code: item.subject_code })}
                          className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all flex items-center gap-1"
                        >
                          <Sparkles size={13} className="text-amber-500" />
                          View Celebration
                        </button>
                        <button
                          onClick={() => handleMarkActive(item)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-all"
                          title="Undo pass (mark back as active)"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => handleRemoveArrear(item)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                          title="Remove record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
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

      {/* Pass Celebration Modal */}
      <ArrearPassCelebrationModal
        isOpen={!!celebrationSubject}
        subjectName={celebrationSubject?.name}
        subjectCode={celebrationSubject?.code}
        onClose={() => setCelebrationSubject(null)}
      />

      {/* Motivation Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Study Motivation Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-5">
              Receive gentle, encouraging messages at spaced intervals while you prepare for arrear exams.
            </p>

            <div className="space-y-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl">
                <div>
                  <span className="text-sm font-bold text-gray-900 block">Motivational Messages</span>
                  <span className="text-xs text-gray-500">Show occasional pop-ups while studying</span>
                </div>
                <input
                  type="checkbox"
                  checked={motivationSettings.enabled}
                  onChange={(e) => handleSaveSettings({ enabled: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Language selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-2">
                  Preferred Message Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['both', 'english', 'tanglish'] as ArrearMotivationLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleSaveSettings({ language: lang })}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all capitalize border ${
                        motivationSettings.language === lang
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {lang === 'both' ? 'Both' : lang === 'tanglish' ? 'Tanglish' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timing info */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 text-xs text-blue-800">
                💡 Messages appear randomly every 5 to 12 minutes while actively studying an arrear subject, and automatically pause when you leave.
              </div>
            </div>

            <div className="mt-6">
              <Button fullWidth onClick={() => setShowSettingsModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}