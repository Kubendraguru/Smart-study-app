import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  AlertCircle,
  Eye,
  RefreshCw,
  GraduationCap,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Badge from '@/components/ui/Badge';
import { getAllTeacherPdfs, getPdfViewTracking } from '@/service/tracking';
import { getTeacherCohortProgress } from '@/service/progress';
import { getSubjects } from '@/service/subject';
import type { PdfTrackingStats, TeacherCohortProgress, Subject } from '@/types';

type ScreenMode = 'progress' | 'pdf';
type Tab = 'viewed' | 'notViewed';
type ProgressFilter = 'all' | 'incomplete' | 'completed';

export default function PdfTrackingScreen() {
  const { pdfId: routePdfId } = useParams<{ pdfId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedPdfId = routePdfId || searchParams.get('pdfId') || '';

  const [screenMode, setScreenMode] = useState<ScreenMode>('progress');

  // PDF Tracking
  const [pdfs, setPdfs] = useState<
    { id: string; title: string; subjectName: string; unitTitle: string; createdAt: string }[]
  >([]);
  const [activePdfId, setActivePdfId] = useState<string>(selectedPdfId);
  const [trackingStats, setTrackingStats] = useState<PdfTrackingStats | null>(null);
  const [tab, setTab] = useState<Tab>('viewed');

  // Unit Progress Tracking
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  const [cohortProgress, setCohortProgress] = useState<TeacherCohortProgress | null>(null);
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activePdfId && screenMode === 'pdf') {
      loadPdfStats(activePdfId);
    }
  }, [activePdfId, screenMode]);

  useEffect(() => {
    if (activeSubjectId && screenMode === 'progress') {
      loadCohortStats(activeSubjectId);
    }
  }, [activeSubjectId, screenMode]);

  async function loadInitialData() {
    setLoading(true);
    const [pdfList, subjs] = await Promise.all([
      getAllTeacherPdfs(),
      getSubjects(),
    ]);

    setPdfs(pdfList);
    setSubjectsList(subjs || []);

    if (pdfList.length > 0) {
      const initialId = selectedPdfId && pdfList.some((p) => p.id === selectedPdfId)
        ? selectedPdfId
        : pdfList[0].id;
      setActivePdfId(initialId);
    }

    if (subjs && subjs.length > 0) {
      setActiveSubjectId(subjs[0].id);
    }

    setLoading(false);
  }

  async function loadPdfStats(pdfId: string) {
    setRefreshing(true);
    const result = await getPdfViewTracking(pdfId);
    setTrackingStats(result.stats);
    setRefreshing(false);
  }

  async function loadCohortStats(subjectId: string) {
    if (!subjectId) return;
    setRefreshing(true);
    const result = await getTeacherCohortProgress(subjectId);
    setCohortProgress(result);
    setRefreshing(false);
  }

  const handleSelectPdf = (id: string) => {
    setActivePdfId(id);
    setSearchParams({ pdfId: id });
  };

  const handleRefresh = () => {
    if (screenMode === 'pdf' && activePdfId) {
      loadPdfStats(activePdfId);
    } else if (screenMode === 'progress' && activeSubjectId) {
      loadCohortStats(activeSubjectId);
    }
  };

  const filteredViewed = (trackingStats?.viewedStudents ?? []).filter((s) =>
    `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotViewed = (trackingStats?.notViewedStudents ?? []).filter((s) =>
    `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = (cohortProgress?.students ?? []).filter((s) => {
    const matches = `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matches) return false;
    if (progressFilter === 'completed') return s.percentage === 100;
    if (progressFilter === 'incomplete') return s.percentage < 100;
    return true;
  });

  const formatViewedTime = (isoString?: string) => {
    if (!isoString) return 'Viewed';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Viewed';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-600 bg-emerald-500';
    if (percentage >= 40) return 'text-blue-600 bg-blue-600';
    return 'text-amber-600 bg-amber-500';
  };

  return (
    <>
      <AppHeader
        title="Student Tracking & Analytics"
        showBack
        rightAction={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        }
      />

      <PageContainer showBottomNav>
        <div className="pt-4 max-w-2xl mx-auto space-y-5">
          {/* Mode Switch Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setScreenMode('progress')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                screenMode === 'progress'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GraduationCap size={16} />
              <span>Unit Progress Analytics</span>
            </button>

            <button
              onClick={() => setScreenMode('pdf')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                screenMode === 'pdf'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText size={16} />
              <span>PDF View Tracking</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* MODE: UNIT PROGRESS                                       */}
          {/* ========================================================= */}
          {screenMode === 'progress' && (
            <>
              {/* Subject Selector Dropdown */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Select Subject to Monitor
                </label>
                <select
                  value={activeSubjectId}
                  onChange={(e) => setActiveSubjectId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} (Sem {s.semester})
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Loading progress data...</p>
                </div>
              ) : !cohortProgress ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <GraduationCap size={36} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-800">No Cohort Data</p>
                  <p className="text-xs text-gray-400 mt-1">Select a subject above to view student completion rates.</p>
                </div>
              ) : (
                <>
                  {/* Cohort Overview Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/20"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                          {cohortProgress.subjectCode} • Sem {cohortProgress.semester}
                        </span>
                        <h2 className="text-lg font-black mt-0.5">{cohortProgress.subjectName}</h2>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex flex-col items-center justify-center">
                        <span className="text-lg font-black">{cohortProgress.averagePercentage}%</span>
                        <span className="text-[9px] text-blue-100 font-semibold">Class Avg</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
                      <div>
                        <p className="text-xl font-black">{cohortProgress.totalStudents}</p>
                        <p className="text-[11px] text-blue-100">Enrolled Students</p>
                      </div>
                      <div>
                        <p className="text-xl font-black">{cohortProgress.totalUnits}</p>
                        <p className="text-[11px] text-blue-100">Units in Subject</p>
                      </div>
                      <div>
                        <p className="text-xl font-black">{cohortProgress.fullyCompletedStudentsCount}</p>
                        <p className="text-[11px] text-blue-100">100% Finished</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Filter chips & Search */}
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProgressFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          progressFilter === 'all'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        All ({cohortProgress.students.length})
                      </button>
                      <button
                        onClick={() => setProgressFilter('incomplete')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          progressFilter === 'incomplete'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        In Progress ({cohortProgress.students.filter((s) => s.percentage < 100).length})
                      </button>
                      <button
                        onClick={() => setProgressFilter('completed')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          progressFilter === 'completed'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        Completed ({cohortProgress.fullyCompletedStudentsCount})
                      </button>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by student name or register no..."
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Student Cards List */}
                  <div className="space-y-3">
                    {filteredStudents.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                        <p className="text-xs text-gray-400">No students match your filter.</p>
                      </div>
                    ) : (
                      filteredStudents.map((student) => {
                        const isExpanded = expandedStudentId === student.studentId;
                        const colorClasses = getProgressColor(student.percentage);

                        return (
                          <div
                            key={student.studentId}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                          >
                            <button
                              onClick={() => setExpandedStudentId(isExpanded ? null : student.studentId)}
                              className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-sm font-bold text-gray-900 truncate">{student.studentName}</h4>
                                  <span className={`text-xs font-black ${colorClasses.split(' ')[0]}`}>
                                    {student.percentage}%
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-400 mb-2 font-medium">
                                  Reg: {student.registerNumber} • Sem {student.semester}
                                </p>

                                {/* Progress Bar */}
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                                  <div
                                    className={`h-full rounded-full ${colorClasses.split(' ')[1]}`}
                                    style={{ width: `${Math.min(100, Math.max(0, student.percentage))}%` }}
                                  />
                                </div>

                                <p className="text-[11px] text-gray-500 font-medium">
                                  Completed {student.completedUnits} of {student.totalUnits} units
                                  {student.remainingUnits > 0 ? ` (${student.remainingUnits} incomplete)` : ' ✓'}
                                </p>
                              </div>

                              <div className="p-1 text-gray-400 mt-1">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </button>

                            {/* Expanded Unit Lists */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3"
                                >
                                  {/* Incomplete Units */}
                                  {student.incompleteUnits.length > 0 && (
                                    <div>
                                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                                        Incomplete Units ({student.incompleteUnits.length})
                                      </p>
                                      <div className="space-y-1">
                                        {student.incompleteUnits.map((u) => (
                                          <div
                                            key={u.id}
                                            className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2 rounded-lg border border-amber-200/60"
                                          >
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <span className="font-semibold text-gray-500">Unit {u.unitNumber}:</span>
                                            <span className="truncate">{u.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Completed Units */}
                                  {student.completedUnitsList.length > 0 && (
                                    <div>
                                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                                        Completed Units ({student.completedUnitsList.length})
                                      </p>
                                      <div className="space-y-1">
                                        {student.completedUnitsList.map((u) => (
                                          <div
                                            key={u.id}
                                            className="flex items-center gap-2 text-xs text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200/60"
                                          >
                                            <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                                            <span className="font-semibold text-emerald-600">Unit {u.unitNumber}:</span>
                                            <span className="truncate">{u.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* MODE: PDF VIEW TRACKING                                   */}
          {/* ========================================================= */}
          {screenMode === 'pdf' && (
            <>
              {/* PDF Selector Dropdown */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Select Uploaded PDF
                </label>
                <select
                  value={activePdfId}
                  onChange={(e) => handleSelectPdf(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {pdfs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.subjectName} • {p.unitTitle})
                    </option>
                  ))}
                </select>
              </div>

              {!trackingStats ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <FileText size={36} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-800">No PDF selected</p>
                </div>
              ) : (
                <>
                  {/* Overview Stats Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/20"
                  >
                    <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                      {trackingStats.subjectName} • {trackingStats.unitTitle}
                    </span>
                    <h2 className="text-lg font-black mt-0.5 mb-3">{trackingStats.pdfTitle}</h2>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-2.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, trackingStats.viewedPercentage))}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-white">{trackingStats.viewedPercentage}%</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-3">
                      <div>
                        <p className="text-xl font-black">{trackingStats.totalStudents}</p>
                        <p className="text-[11px] text-blue-100">Total Students</p>
                      </div>
                      <div>
                        <p className="text-xl font-black text-emerald-300">{trackingStats.viewedCount}</p>
                        <p className="text-[11px] text-blue-100">Opened</p>
                      </div>
                      <div>
                        <p className="text-xl font-black text-rose-300">{trackingStats.notViewedCount}</p>
                        <p className="text-[11px] text-blue-100">Not Opened</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Tabs: Viewed vs Not Viewed */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTab('viewed')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        tab === 'viewed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      <CheckCircle2 size={15} />
                      <span>Viewed ({trackingStats.viewedCount})</span>
                    </button>
                    <button
                      onClick={() => setTab('notViewed')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        tab === 'notViewed'
                          ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      <Clock size={15} />
                      <span>Not Viewed ({trackingStats.notViewedCount})</span>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search student or register no..."
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Students List */}
                  <div className="space-y-2">
                    {tab === 'viewed' && (
                      filteredViewed.length === 0 ? (
                        <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
                          <p className="text-xs text-gray-400">No students found.</p>
                        </div>
                      ) : (
                        filteredViewed.map((s) => (
                          <div
                            key={s.studentId}
                            className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                {s.studentName ? s.studentName.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{s.studentName}</p>
                                <p className="text-[11px] text-gray-400">{s.registerNumber}</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              {formatViewedTime(s.viewedAt)}
                            </span>
                          </div>
                        ))
                      )
                    )}

                    {tab === 'notViewed' && (
                      filteredNotViewed.length === 0 ? (
                        <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
                          <p className="text-xs text-gray-400">All students have opened this document! 🎉</p>
                        </div>
                      ) : (
                        filteredNotViewed.map((s) => (
                          <div
                            key={s.studentId}
                            className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                                {s.studentName ? s.studentName.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{s.studentName}</p>
                                <p className="text-[11px] text-gray-400">{s.registerNumber}</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-bold">
                              Pending
                            </span>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
