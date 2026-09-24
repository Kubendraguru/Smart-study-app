import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  CheckCircle2,
  Circle,
  BookOpen,
  FileText,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import Badge from '@/components/ui/Badge';
import { getStudentOverallProgress, toggleUnitCompletion } from '@/service/progress';
import type { StudentOverallProgress } from '@/types';

export default function StudentProgressScreen() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<StudentOverallProgress | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [togglingUnitId, setTogglingUnitId] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStudentOverallProgress();
      setProgressData(data);

      if (data.subjects.length > 0) {
        setExpandedSubjects((prev) => {
          if (Object.keys(prev).length === 0) {
            const allExpanded: Record<string, boolean> = {};
            data.subjects.forEach((s) => {
              allExpanded[s.subjectId] = true;
            });
            return allExpanded;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load progress data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  const toggleAllExpand = () => {
    const areAllExpanded = progressData?.subjects.every((s) => expandedSubjects[s.subjectId]);
    const newState: Record<string, boolean> = {};
    progressData?.subjects.forEach((s) => {
      newState[s.subjectId] = !areAllExpanded;
    });
    setExpandedSubjects(newState);
  };

  const handleToggleUnit = async (subjectId: string, unitId: string, currentCompleted: boolean) => {
    if (togglingUnitId) return;

    const nextCompleted = !currentCompleted;
    setTogglingUnitId(unitId);

    // Optimistic state update
    setProgressData((prev) => {
      if (!prev) return prev;

      let newAllCompleted = 0;
      let newAllTotal = 0;

      const updatedSubjects = prev.subjects.map((s) => {
        if (s.subjectId !== subjectId) {
          newAllCompleted += s.completedUnits;
          newAllTotal += s.totalUnits;
          return s;
        }

        let subjCompleted = 0;
        const updatedUnits = s.units.map((u) => {
          const isDone = u.id === unitId ? nextCompleted : u.completed;
          if (isDone) subjCompleted += 1;
          return { ...u, completed: isDone };
        });

        const percentage = s.totalUnits > 0 ? Math.round((subjCompleted / s.totalUnits) * 100) : 0;
        newAllCompleted += subjCompleted;
        newAllTotal += s.totalUnits;

        return {
          ...s,
          completedUnits: subjCompleted,
          remainingUnits: Math.max(0, s.totalUnits - subjCompleted),
          percentage,
          units: updatedUnits,
        };
      });

      const overallPercentage = newAllTotal > 0 ? Math.round((newAllCompleted / newAllTotal) * 100) : 0;

      return {
        ...prev,
        completedUnits: newAllCompleted,
        remainingUnits: Math.max(0, newAllTotal - newAllCompleted),
        overallPercentage,
        subjects: updatedSubjects,
      };
    });

    const res = await toggleUnitCompletion(unitId, nextCompleted);
    setTogglingUnitId(null);

    if (!res.success) {
      loadProgress();
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-600 bg-emerald-500';
    if (percentage >= 40) return 'text-blue-600 bg-blue-600';
    return 'text-amber-600 bg-amber-500';
  };

  return (
    <>
      <AppHeader title="Learning Progress" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4 max-w-2xl mx-auto space-y-6">
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-500">Loading your academic progress...</p>
            </div>
          ) : (
            <>
              {/* Overview Hero Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 bg-white/15 px-3 py-1 rounded-xl backdrop-blur-sm">
                    <GraduationCap size={16} />
                    <span className="text-xs font-semibold">Academic Overview</span>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white">
                    {progressData?.overallPercentage ?? 0}%
                  </div>
                </div>

                <h1 className="text-xl font-black mb-1">Overall Curriculum Completion</h1>
                <p className="text-xs text-blue-100 mb-5">
                  Track your completed units and stay ahead of your semester syllabus
                </p>

                {/* Main Progress Bar */}
                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mb-6 p-0.5">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, progressData?.overallPercentage ?? 0))}%` }}
                  />
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                    <div className="w-7 h-7 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center mb-1.5">
                      <CheckCircle2 size={16} />
                    </div>
                    <p className="text-lg font-bold">{progressData?.completedUnits ?? 0}</p>
                    <p className="text-[11px] text-blue-100">Completed Units</p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center mb-1.5">
                      <Layers size={16} />
                    </div>
                    <p className="text-lg font-bold">{progressData?.remainingUnits ?? 0}</p>
                    <p className="text-[11px] text-blue-100">Remaining Units</p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                    <div className="w-7 h-7 rounded-lg bg-blue-300/20 text-blue-200 flex items-center justify-center mb-1.5">
                      <BookOpen size={16} />
                    </div>
                    <p className="text-lg font-bold">{progressData?.totalSubjects ?? 0}</p>
                    <p className="text-[11px] text-blue-100">Active Subjects</p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                    <div className="w-7 h-7 rounded-lg bg-purple-300/20 text-purple-200 flex items-center justify-center mb-1.5">
                      <FileText size={16} />
                    </div>
                    <p className="text-lg font-bold">{progressData?.pdfViewsCount ?? 0}</p>
                    <p className="text-[11px] text-blue-100">PDFs Opened</p>
                  </div>
                </div>
              </motion.div>

              {/* Subject-Wise Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Subject Breakdown & Unit Checklist</h2>
                    <p className="text-xs text-gray-500">Check off completed units to update your curriculum progress</p>
                  </div>
                  {progressData && progressData.subjects.length > 0 && (
                    <button
                      onClick={toggleAllExpand}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 shadow-sm"
                    >
                      {progressData.subjects.every((s) => expandedSubjects[s.subjectId])
                        ? 'Collapse All'
                        : 'Expand All'}
                    </button>
                  )}
                </div>

                {(!progressData || progressData.subjects.length === 0) ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                    <BookOpen size={40} className="text-gray-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-gray-800">No Subjects Enrolled</h3>
                    <p className="text-xs text-gray-500 mt-1">Enroll in subjects to start tracking your progress.</p>
                  </div>
                ) : (
                  progressData.subjects.map((subj) => {
                    const isExpanded = Boolean(expandedSubjects[subj.subjectId]);
                    const colorClasses = getProgressColor(subj.percentage);

                    return (
                      <motion.div
                        key={subj.subjectId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                      >
                        {/* Subject Card Header */}
                        <button
                          onClick={() => toggleSubject(subj.subjectId)}
                          className="w-full p-5 text-left flex items-start justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge color={subj.isArrear ? 'yellow' : 'blue'}>
                                {subj.isArrear ? 'Arrear Subject' : `Semester ${subj.semester}`}
                              </Badge>
                              <span className="text-xs font-semibold text-gray-400">{subj.subjectCode}</span>
                            </div>

                            <h3 className="text-base font-bold text-gray-900 truncate mb-2">{subj.subjectName}</h3>

                            {/* Subject Progress Bar */}
                            <div className="flex items-center gap-3 mb-1.5">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${colorClasses.split(' ')[1]}`}
                                  style={{ width: `${Math.min(100, Math.max(0, subj.percentage))}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${colorClasses.split(' ')[0]}`}>
                                {subj.percentage}%
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 font-medium">
                              Completed {subj.completedUnits} of {subj.totalUnits} units
                              {subj.remainingUnits > 0 ? ` (${subj.remainingUnits} remaining)` : ' ✓ Finished'}
                            </p>
                          </div>

                          <div className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-600 mt-1">
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </button>

                        {/* Units Checklist (Expanded View) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-gray-100 bg-gray-50/50 px-5 py-4"
                            >
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                Unit Checklist
                              </p>

                              {subj.units.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2">No units added yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {subj.units.map((unit) => {
                                    const isDone = unit.completed;
                                    const isToggling = togglingUnitId === unit.id;

                                    return (
                                      <div
                                        key={unit.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                          isDone
                                            ? 'bg-emerald-50/70 border-emerald-200'
                                            : 'bg-white border-gray-200/80 hover:border-gray-300'
                                        }`}
                                      >
                                        <button
                                          onClick={() => handleToggleUnit(subj.subjectId, unit.id, isDone)}
                                          disabled={isToggling}
                                          className="flex items-center gap-3 text-left flex-1 min-w-0"
                                        >
                                          {isToggling ? (
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                          ) : isDone ? (
                                            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                                          ) : (
                                            <Circle size={20} className="text-gray-400 flex-shrink-0" />
                                          )}

                                          <div className="min-w-0">
                                            <span
                                              className={`text-[11px] font-bold block ${
                                                isDone ? 'text-emerald-700' : 'text-gray-400'
                                              }`}
                                            >
                                              Unit {unit.unitNumber}
                                            </span>
                                            <p
                                              className={`text-xs font-semibold truncate ${
                                                isDone ? 'text-emerald-950 line-through' : 'text-gray-800'
                                              }`}
                                            >
                                              {unit.title}
                                            </p>
                                          </div>
                                        </button>

                                        <button
                                          onClick={() =>
                                            navigate(`/subject/${subj.subjectId}/unit/${unit.id}`)
                                          }
                                          className="ml-3 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1"
                                        >
                                          <span>Open</span>
                                          <ArrowRight size={12} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
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
