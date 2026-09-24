import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Calculator,
  Settings,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Award,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
  X,
  FileCheck,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/context/AuthContext';
import {
  PRESET_GRADING_SCHEMES,
  DEFAULT_GPA_SETTINGS,
  getActiveGradeDefinitions,
  lookupGradePoint,
  calculateSemesterSummary,
  calculateOverallAcademicSummary,
  getStudentGpaSettings,
  saveStudentGpaSettings,
  getStudentAcademicSummary,
  saveSemesterResults,
  deleteSemesterResults,
  importCurriculumSubjects,
} from '@/service/gpa';
import type {
  GradingSchemeId,
  RepeatAttemptPolicy,
  GradeDefinition,
  StudentGpaSettings,
  AcademicCourse,
  SemesterAcademicSummary,
  OverallAcademicSummary,
} from '@/types';

export default function GpaCalculatorScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [academicSummary, setAcademicSummary] = useState<OverallAcademicSummary | null>(null);

  // Active Selected Semester
  const [selectedSemNum, setSelectedSemNum] = useState<number>(1);
  const [activeCourses, setActiveCourses] = useState<AcademicCourse[]>([]);
  const [academicYear, setAcademicYear] = useState<string>('');

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<StudentGpaSettings>(DEFAULT_GPA_SETTINGS);
  const [customGradesList, setCustomGradesList] = useState<GradeDefinition[]>([]);

  // Confirmation Modal for Deletion
  const [deleteModalSem, setDeleteModalSem] = useState<number | null>(null);

  // Success / Error Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load of Academic Data
  const loadAcademicData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const summary = await getStudentAcademicSummary(user.id);
      setAcademicSummary(summary);
      setTempSettings(summary.settings);
      setCustomGradesList(
        summary.settings.customGrades.length > 0
          ? summary.settings.customGrades
          : PRESET_GRADING_SCHEMES[0].grades
      );

      // Select latest saved semester, or semester 1
      if (summary.semesters.length > 0) {
        const lastSem = summary.semesters[summary.semesters.length - 1];
        setSelectedSemNum(lastSem.semesterNumber);
        setActiveCourses(JSON.parse(JSON.stringify(lastSem.courses)));
        setAcademicYear(lastSem.academicYear || '');
      } else {
        setSelectedSemNum(1);
        setActiveCourses([]);
      }
    } catch (err) {
      console.error('Failed to load academic data:', err);
      showToast('Failed to load academic records', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAcademicData();
  }, [loadAcademicData]);

  // Sync active courses when switching semester tab
  const handleSelectSemester = (semNum: number) => {
    setSelectedSemNum(semNum);
    const existing = academicSummary?.semesters.find((s) => s.semesterNumber === semNum);
    if (existing) {
      setActiveCourses(JSON.parse(JSON.stringify(existing.courses)));
      setAcademicYear(existing.academicYear || '');
    } else {
      setActiveCourses([]);
      setAcademicYear('');
    }
  };

  // Active Grading Definitions
  const activeGrades = useMemo(() => {
    const settings = academicSummary?.settings || DEFAULT_GPA_SETTINGS;
    return getActiveGradeDefinitions(settings);
  }, [academicSummary?.settings]);

  // Real-time calculation of current semester GPA
  const currentSemesterCalculation = useMemo(() => {
    const settings = academicSummary?.settings || DEFAULT_GPA_SETTINGS;
    return calculateSemesterSummary(selectedSemNum, activeCourses, settings, undefined, academicYear);
  }, [selectedSemNum, activeCourses, academicSummary?.settings, academicYear]);

  // List of available semesters (1 through 8 by default, plus any saved higher semesters)
  const availableSemesterNumbers = useMemo(() => {
    const defaultList = [1, 2, 3, 4, 5, 6, 7, 8];
    const savedNums = (academicSummary?.semesters || []).map((s) => s.semesterNumber);
    const combined = Array.from(new Set([...defaultList, ...savedNums])).sort((a, b) => a - b);
    return combined;
  }, [academicSummary?.semesters]);

  // Add a new empty subject row
  const handleAddSubject = () => {
    const newCourse: AcademicCourse = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      studentId: user?.id || '',
      semesterNumber: selectedSemNum,
      subjectCode: '',
      subjectName: '',
      credits: 3.0,
      grade: activeGrades[0]?.grade || 'O',
      gradePoint: activeGrades[0]?.points || 10,
      isArrear: false,
      isCleared: true,
      isExcluded: false,
      attemptNumber: 1,
    };
    setActiveCourses((prev) => [...prev, newCourse]);
  };

  // Remove a subject row
  const handleRemoveSubject = (index: number) => {
    setActiveCourses((prev) => prev.filter((_, i) => i !== index));
  };

  // Update a course field
  const handleCourseChange = (index: number, field: keyof AcademicCourse, value: any) => {
    setActiveCourses((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'grade') {
        const settings = academicSummary?.settings || DEFAULT_GPA_SETTINGS;
        const { points, isPass, isCounted } = lookupGradePoint(value, settings);
        item.gradePoint = points;
        item.isCleared = isPass || points >= settings.passingMinPoints;
        item.isExcluded = !isCounted;
      }

      updated[index] = item;
      return updated;
    });
  };

  // Import curriculum subjects for selected semester
  const handleImportCurriculum = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const imported = await importCurriculumSubjects(selectedSemNum, user.id);
      if (imported.length === 0) {
        showToast(`No registered curriculum subjects found for Semester ${selectedSemNum}`, 'info');
      } else {
        // Merge with current courses or replace if empty
        if (activeCourses.length === 0) {
          setActiveCourses(imported);
        } else {
          // Add non-duplicate subjects
          const existingCodes = new Set(activeCourses.map((c) => (c.subjectCode || '').trim().toUpperCase()).filter(Boolean));
          const existingNames = new Set(activeCourses.map((c) => c.subjectName.trim().toLowerCase()));
          const filteredImport = imported.filter(
            (c) =>
              !(c.subjectCode && existingCodes.has(c.subjectCode.trim().toUpperCase())) &&
              !existingNames.has(c.subjectName.trim().toLowerCase())
          );
          setActiveCourses((prev) => [...prev, ...filteredImport]);
        }
        showToast(`Imported ${imported.length} subjects for Semester ${selectedSemNum}`, 'success');
      }
    } catch (err) {
      console.error('Error importing curriculum:', err);
      showToast('Error importing curriculum subjects', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Save semester results
  const handleSaveSemester = async () => {
    if (!user) return;

    if (activeCourses.length === 0) {
      showToast('Please add at least one subject before saving', 'error');
      return;
    }

    // Validate courses
    for (let i = 0; i < activeCourses.length; i++) {
      const c = activeCourses[i];
      if (!c.subjectName.trim()) {
        showToast(`Subject #${i + 1} is missing a subject name`, 'error');
        return;
      }
      if (!c.credits || c.credits <= 0) {
        showToast(`Subject "${c.subjectName}" must have credits greater than 0`, 'error');
        return;
      }
      if (!c.grade) {
        showToast(`Subject "${c.subjectName}" must have a grade selected`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await saveSemesterResults(selectedSemNum, activeCourses, user.id, academicYear);
      if (res.success) {
        showToast(`Semester ${selectedSemNum} results saved successfully!`, 'success');
        // Refresh full summary
        const updated = await getStudentAcademicSummary(user.id);
        setAcademicSummary(updated);
      } else {
        showToast(res.error || 'Failed to save semester results', 'error');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Error saving semester results', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete semester results
  const confirmDeleteSemester = async () => {
    if (!user || deleteModalSem === null) return;
    const semToDelete = deleteModalSem;
    setDeleteModalSem(null);
    setSaving(true);
    try {
      const res = await deleteSemesterResults(semToDelete, user.id);
      if (res.success) {
        showToast(`Semester ${semToDelete} records deleted`, 'info');
        const updated = await getStudentAcademicSummary(user.id);
        setAcademicSummary(updated);
        if (selectedSemNum === semToDelete) {
          setActiveCourses([]);
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error deleting semester records', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Settings Modal
  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      const settingsPayload: Partial<StudentGpaSettings> = {
        ...tempSettings,
        customGrades: tempSettings.gradingSchemeId === 'custom' ? customGradesList : [],
      };

      const res = await saveStudentGpaSettings(settingsPayload, user.id);
      if (res.success && res.data) {
        showToast('Grading scheme & calculation rules updated!', 'success');
        setIsSettingsOpen(false);
        // Refresh summary with new scheme recalculation
        const updated = await getStudentAcademicSummary(user.id);
        setAcademicSummary(updated);
      }
    } catch (err) {
      console.error('Error saving GPA settings:', err);
      showToast('Error saving grading scheme settings', 'error');
    }
  };

  // Color helper for GPA & CGPA badges
  const getGpaColorClass = (val: number, max: number = 10) => {
    const ratio = max > 0 ? val / max : 0;
    if (ratio >= 0.85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (ratio >= 0.70) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (ratio >= 0.55) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  return (
    <>
      <AppHeader title="GPA & CGPA Calculator" showBack onBack={() => navigate('/home')} />
      <PageContainer showBottomNav>
        <div className="pt-4 pb-12 max-w-5xl mx-auto space-y-6">

          {/* Toast Banner */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-2xl flex items-center justify-between shadow-md border ${
                  toastMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : toastMessage.type === 'error'
                    ? 'bg-rose-50 text-rose-900 border-rose-200'
                    : 'bg-blue-50 text-blue-900 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {toastMessage.type === 'success' ? (
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  ) : toastMessage.type === 'error' ? (
                    <AlertCircle size={20} className="text-rose-600" />
                  ) : (
                    <Info size={20} className="text-blue-600" />
                  )}
                  <span className="text-sm font-semibold">{toastMessage.text}</span>
                </div>
                <button
                  onClick={() => setToastMessage(null)}
                  className="p-1 rounded-lg hover:bg-black/5 text-gray-500"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1. GPA & CGPA Hero Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden"
          >
            {/* Ambient Background Circles */}
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              {/* Left CGPA Hero */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm border border-white/20">
                    {academicSummary?.settings.gradingSchemeName || 'Anna University 10-Point'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-400/30 text-[11px] font-bold text-blue-100">
                    Student Configured
                  </span>
                </div>
                <h1 className="text-sm font-medium text-blue-100">Overall Cumulative Grade Point Average</h1>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight">
                    {academicSummary && academicSummary.totalSemesters > 0
                      ? academicSummary.overallCgpa.toFixed(2)
                      : '0.00'}
                  </span>
                  <span className="text-lg text-blue-200 font-bold">
                    / {academicSummary?.settings.maxGradePoint.toFixed(1) || '10.0'} CGPA
                  </span>
                </div>
                <p className="text-xs text-blue-200/90 max-w-md">
                  Calculated using credit-weighted grade points across all saved semesters.
                </p>
              </div>

              {/* Right Settings Button & Quick Stats */}
              <div className="flex flex-col sm:items-end gap-3">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-xs font-bold text-white flex items-center gap-2 backdrop-blur-md border border-white/20 shadow-sm"
                >
                  <Settings size={16} />
                  <span>Configure Grading Scheme</span>
                </button>

                <div className="grid grid-cols-3 gap-3 w-full sm:w-auto text-center mt-2">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                    <p className="text-xs text-blue-200">Current GPA</p>
                    <p className="text-lg font-bold text-white">
                      {academicSummary && academicSummary.semesters.length > 0
                        ? academicSummary.currentSemesterGpa.toFixed(2)
                        : '0.00'}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                    <p className="text-xs text-blue-200">Semesters</p>
                    <p className="text-lg font-bold text-white">
                      {academicSummary?.totalSemesters ?? 0}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                    <p className="text-xs text-blue-200">Credits</p>
                    <p className="text-lg font-bold text-white">
                      {academicSummary?.totalCreditsEarned ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. Academic Progress Visualization Trend Chart */}
          {academicSummary && academicSummary.history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Academic Progress Trend</h2>
                    <p className="text-xs text-gray-500">Semester GPA and cumulative CGPA progression over time</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="text-gray-600">Semester GPA</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-gray-600">CGPA to Date</span>
                  </div>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="pt-4 pb-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                  {academicSummary.history.map((trend) => {
                    const maxGpa = academicSummary.settings.maxGradePoint || 10;
                    const gpaPercent = Math.min(100, Math.max(10, (trend.gpa / maxGpa) * 100));
                    const cgpaPercent = Math.min(100, Math.max(10, (trend.cgpaToDate / maxGpa) * 100));

                    return (
                      <div
                        key={trend.semesterNumber}
                        className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100 flex flex-col justify-between hover:bg-blue-50/30 transition-all text-center"
                      >
                        <span className="text-xs font-bold text-gray-500 mb-2">Sem {trend.semesterNumber}</span>
                        
                        {/* Dual Progress Bars */}
                        <div className="space-y-1.5 my-2">
                          <div>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-0.5 font-medium">
                              <span>GPA</span>
                              <span className="font-bold text-blue-700">{trend.gpa.toFixed(2)}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${gpaPercent}%` }}
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-0.5 font-medium">
                              <span>CGPA</span>
                              <span className="font-bold text-emerald-700">{trend.cgpaToDate.toFixed(2)}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${cgpaPercent}%` }}
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] text-gray-400 font-semibold mt-1">
                          {trend.creditsEarned} Cr Earned
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. Semester Selection & Course Manager */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">

            {/* Semester Tabs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-600" />
                  <h2 className="text-base font-bold text-gray-900">Semester Results & Subjects</h2>
                </div>
                <span className="text-xs text-gray-500">
                  Select a semester to enter or edit grades
                </span>
              </div>

              {/* Horizontal Semester Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {availableSemesterNumbers.map((num) => {
                  const isSelected = selectedSemNum === num;
                  const hasSavedData = academicSummary?.semesters.some(
                    (s) => s.semesterNumber === num && s.courses.length > 0
                  );
                  const semGpa = academicSummary?.semesters.find((s) => s.semesterNumber === num)?.gpa;

                  return (
                    <button
                      key={num}
                      onClick={() => handleSelectSemester(num)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                          : hasSavedData
                          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span>Semester {num}</span>
                      {hasSavedData && semGpa !== undefined && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-blue-200/60 text-blue-800'
                          }`}
                        >
                          {semGpa.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Add Extra Semester Button */}
                <button
                  onClick={() => {
                    const nextNum = Math.max(...availableSemesterNumbers) + 1;
                    handleSelectSemester(nextNum);
                  }}
                  className="px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>Add Sem</span>
                </button>
              </div>
            </div>

            {/* Selected Semester Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Semester {selectedSemNum}</h3>
                  {activeCourses.length > 0 && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                      {activeCourses.length} {activeCourses.length === 1 ? 'Course' : 'Courses'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter course details, credits, and grades obtained.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleImportCurriculum}
                  disabled={importing}
                  className="px-3.5 py-2 rounded-xl bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all text-xs font-semibold border border-gray-200 shadow-sm flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>{importing ? 'Importing...' : 'Import Curriculum Subjects'}</span>
                </button>

                <button
                  onClick={handleAddSubject}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 transition-all text-xs font-bold flex items-center gap-1.5 border border-blue-200"
                >
                  <Plus size={14} />
                  <span>Add Subject</span>
                </button>

                {academicSummary?.semesters.some((s) => s.semesterNumber === selectedSemNum) && (
                  <button
                    onClick={() => setDeleteModalSem(selectedSemNum)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                    title="Delete Semester Data"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Courses Table / Form */}
            {activeCourses.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                  <Calculator size={28} />
                </div>
                <h3 className="text-base font-bold text-gray-800">No Subjects Added Yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Add subjects manually or click "Import Curriculum Subjects" to automatically load subjects from the smart study curriculum with credits.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={handleImportCurriculum}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <Download size={15} />
                    <span>Import Registered Subjects</span>
                  </button>
                  <button
                    onClick={handleAddSubject}
                    className="px-4 py-2.5 rounded-xl bg-white text-gray-700 border border-gray-300 font-bold text-xs hover:bg-gray-100 transition-all flex items-center gap-2"
                  >
                    <Plus size={15} />
                    <span>Add Blank Subject</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/90 text-gray-500 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3.5 pl-4">Subject Code</th>
                        <th className="p-3.5">Subject Name</th>
                        <th className="p-3.5 w-24">Credits</th>
                        <th className="p-3.5 w-32">Grade Obtained</th>
                        <th className="p-3.5 w-24 text-center">Grade Point</th>
                        <th className="p-3.5 w-28 text-center">Cr × Point</th>
                        <th className="p-3.5 w-24 text-center">Arrear?</th>
                        <th className="p-3.5 pr-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeCourses.map((course, idx) => {
                        const weighted = (course.credits * course.gradePoint).toFixed(1);

                        return (
                          <tr key={course.id || idx} className="hover:bg-blue-50/20 transition-colors">
                            <td className="p-3 pl-4">
                              <input
                                type="text"
                                placeholder="CS3591"
                                value={course.subjectCode || ''}
                                onChange={(e) => handleCourseChange(idx, 'subjectCode', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="e.g. Distributed Computing"
                                value={course.subjectName}
                                onChange={(e) => handleCourseChange(idx, 'subjectName', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="20"
                                value={course.credits}
                                onChange={(e) =>
                                  handleCourseChange(idx, 'credits', parseFloat(e.target.value) || 0)
                                }
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={course.grade}
                                onChange={(e) => handleCourseChange(idx, 'grade', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              >
                                {activeGrades.map((g) => (
                                  <option key={g.grade} value={g.grade}>
                                    {g.grade} ({g.points} pts)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3 text-center font-bold text-gray-700">
                              {course.gradePoint.toFixed(1)}
                            </td>
                            <td className="p-3 text-center font-bold text-blue-700">
                              {weighted}
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(course.isArrear)}
                                onChange={(e) => handleCourseChange(idx, 'isArrear', e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 pr-4 text-center">
                              <button
                                onClick={() => handleRemoveSubject(idx)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                title="Remove Subject"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-3">
                  {activeCourses.map((course, idx) => (
                    <div
                      key={course.id || idx}
                      className="p-4 rounded-2xl bg-gray-50/90 border border-gray-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">Subject #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(course.isArrear)}
                              onChange={(e) => handleCourseChange(idx, 'isArrear', e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-blue-600"
                            />
                            <span>Arrear</span>
                          </label>
                          <button
                            onClick={() => handleRemoveSubject(idx)}
                            className="p-1 text-gray-400 hover:text-rose-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-[10px] text-gray-500 font-bold block mb-1">Code</label>
                          <input
                            type="text"
                            placeholder="CS3591"
                            value={course.subjectCode || ''}
                            onChange={(e) => handleCourseChange(idx, 'subjectCode', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold uppercase"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-gray-500 font-bold block mb-1">Subject Name</label>
                          <input
                            type="text"
                            placeholder="Subject name"
                            value={course.subjectName}
                            onChange={(e) => handleCourseChange(idx, 'subjectName', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold block mb-1">Credits</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={course.credits}
                            onChange={(e) =>
                              handleCourseChange(idx, 'credits', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold block mb-1">Grade</label>
                          <select
                            value={course.grade}
                            onChange={(e) => handleCourseChange(idx, 'grade', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                          >
                            {activeGrades.map((g) => (
                              <option key={g.grade} value={g.grade}>
                                {g.grade} ({g.points} pts)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold text-gray-600 bg-white/70 p-2 rounded-xl border border-gray-100">
                        <span>Grade Points: {course.gradePoint}</span>
                        <span className="text-blue-700 font-bold">
                          Total: {(course.credits * course.gradePoint).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real-time Semester GPA Summary Bar */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-center sm:text-left">
                    <div>
                      <p className="text-[11px] text-gray-500 font-semibold uppercase">Semester Credits</p>
                      <p className="text-base font-extrabold text-gray-900">
                        {currentSemesterCalculation.totalCredits.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 font-semibold uppercase">Total Grade Points</p>
                      <p className="text-base font-extrabold text-gray-900">
                        {currentSemesterCalculation.totalGradePoints.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 font-semibold uppercase">Calculated GPA</p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xl font-black px-3 py-0.5 rounded-xl border ${getGpaColorClass(
                            currentSemesterCalculation.gpa,
                            academicSummary?.settings.maxGradePoint || 10
                          )}`}
                        >
                          {currentSemesterCalculation.gpa.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 font-bold">
                          / {academicSummary?.settings.maxGradePoint || 10}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveSemester}
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : `Save Semester ${selectedSemNum} Results`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Repeat Attempt Policy & Formula Notes */}
          <div className="p-5 rounded-3xl bg-blue-50/60 border border-blue-100 flex items-start gap-3.5 text-xs text-blue-900">
            <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">GPA & CGPA Calculation Guidelines:</p>
              <p className="text-blue-800 leading-relaxed">
                • <strong>Semester GPA Formula:</strong> Sum of (Course Credits × Grade Points) / Sum of Course Credits.<br />
                • <strong>Repeat Attempt Policy:</strong> Currently set to{' '}
                <span className="underline font-semibold">
                  {academicSummary?.settings.repeatPolicy === 'latest_attempt'
                    ? 'Use Latest Attempt (cleared arrears replace earlier attempts; credits not double-counted)'
                    : academicSummary?.settings.repeatPolicy === 'highest_attempt'
                    ? 'Use Highest Attempt'
                    : 'Include All Attempts'}
                </span>
                .<br />
                • <em>Note:</em> Calculations are performed based on your configured grading scale for study planning and tracking purposes.
              </p>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Grading Scheme & Rules</h3>
                    <p className="text-xs text-gray-500">Configure university grading scale & repeat rules</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Preset Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-700 block">Grading Scheme Preset</label>
                <div className="space-y-2">
                  {PRESET_GRADING_SCHEMES.map((preset) => (
                    <label
                      key={preset.id}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        tempSettings.gradingSchemeId === preset.id
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gradingScheme"
                        value={preset.id}
                        checked={tempSettings.gradingSchemeId === preset.id}
                        onChange={() => {
                          setTempSettings((prev) => ({
                            ...prev,
                            gradingSchemeId: preset.id,
                            gradingSchemeName: preset.name,
                            maxGradePoint: preset.maxGradePoint,
                            passingMinPoints: preset.passingMinPoints,
                          }));
                        }}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900">{preset.name}</p>
                        <p className="text-[11px] text-gray-500">{preset.description}</p>
                      </div>
                    </label>
                  ))}

                  {/* Custom Option */}
                  <label
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                      tempSettings.gradingSchemeId === 'custom'
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gradingScheme"
                      value="custom"
                      checked={tempSettings.gradingSchemeId === 'custom'}
                      onChange={() => {
                        setTempSettings((prev) => ({
                          ...prev,
                          gradingSchemeId: 'custom',
                          gradingSchemeName: 'Custom University Scheme',
                        }));
                      }}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">Custom Grading Scale</p>
                      <p className="text-[11px] text-gray-500">Define your own grade letters, points, and passing criteria</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Repeat Attempt Policy */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">
                  Arrear & Repeat-Attempt Policy for CGPA
                </label>
                <select
                  value={tempSettings.repeatPolicy}
                  onChange={(e) =>
                    setTempSettings((prev) => ({
                      ...prev,
                      repeatPolicy: e.target.value as RepeatAttemptPolicy,
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="latest_attempt">Latest Attempt (Replaces earlier grade, credits counted once)</option>
                  <option value="highest_attempt">Highest Attempt (Best score kept, credits counted once)</option>
                  <option value="all_attempts">All Attempts (Cumulative count of every attempt)</option>
                </select>
                <p className="text-[11px] text-gray-500">
                  Controls how cleared arrear subjects and repeated courses affect your cumulative CGPA.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalSem !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Delete Semester {deleteModalSem} Records?</h3>
              <p className="text-xs text-gray-500">
                This will delete all saved subject results and grades for Semester {deleteModalSem}. This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteModalSem(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSemester}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-600/20"
                >
                  Delete Records
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
