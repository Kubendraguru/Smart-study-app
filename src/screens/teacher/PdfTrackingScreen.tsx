import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Badge from '@/components/ui/Badge';
import { getAllTeacherPdfs, getPdfViewTracking } from '@/service/tracking';
import type { PdfTrackingStats } from '@/types';

type Tab = 'viewed' | 'notViewed';

export default function PdfTrackingScreen() {
  const { pdfId: routePdfId } = useParams<{ pdfId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedPdfId = routePdfId || searchParams.get('pdfId') || '';

  const [pdfs, setPdfs] = useState<
    { id: string; title: string; subjectName: string; unitTitle: string; createdAt: string }[]
  >([]);
  const [activePdfId, setActivePdfId] = useState<string>(selectedPdfId);
  const [trackingStats, setTrackingStats] = useState<PdfTrackingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('viewed');
  const [searchTerm, setSearchTerm] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    loadPdfsList();
  }, []);

  useEffect(() => {
    if (activePdfId) {
      loadStats(activePdfId);
    }
  }, [activePdfId]);

  async function loadPdfsList() {
    setLoading(true);
    const list = await getAllTeacherPdfs();
    setPdfs(list);

    if (list.length > 0) {
      const initialId = selectedPdfId && list.some((p) => p.id === selectedPdfId)
        ? selectedPdfId
        : list[0].id;
      setActivePdfId(initialId);
    } else {
      setLoading(false);
    }
  }

  async function loadStats(pdfId: string) {
    setRefreshing(true);
    const result = await getPdfViewTracking(pdfId);
    setTrackingStats(result.stats);
    setTableMissing(Boolean(result.tableMissing));
    setLoading(false);
    setRefreshing(false);
  }

  const handleSelectPdf = (id: string) => {
    setActivePdfId(id);
    setSearchParams({ pdfId: id });
  };

  const filteredViewed = (trackingStats?.viewedStudents ?? []).filter((s) =>
    `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotViewed = (trackingStats?.notViewedStudents ?? []).filter((s) =>
    `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <>
      <AppHeader
        title="PDF View Tracking"
        showBack
        rightAction={
          <button
            onClick={() => activePdfId && loadStats(activePdfId)}
            disabled={refreshing || !activePdfId}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        }
      />

      <PageContainer showBottomNav>
        <div className="pt-4 space-y-4">
          {/* PDF Selector Dropdown / Pills */}
          {pdfs.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                Select PDF Material
              </label>
              <select
                value={activePdfId}
                onChange={(e) => handleSelectPdf(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm shadow-gray-200/40"
              >
                {pdfs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.subjectName} - {p.unitTitle})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Database Setup Notice if table missing */}
          {tableMissing && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm mb-1 text-amber-900">Database Setup Required</h4>
                  <p className="text-amber-800 leading-relaxed mb-2">
                    The <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">pdf_views</code> table is not
                    created in your Supabase project yet.
                  </p>
                  <p className="text-amber-700 leading-relaxed">
                    Execute the migration file at{' '}
                    <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">
                      supabase/migrations/20260922_pdf_views.sql
                    </code>{' '}
                    in your Supabase SQL editor.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Loading tracking data...</p>
            </div>
          ) : !trackingStats ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm shadow-gray-200/60">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <FileText size={24} className="text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">No PDFs uploaded yet</h3>
              <p className="text-xs text-gray-500 mb-4">
                Upload course materials to view student reading engagement and attendance.
              </p>
              <button
                onClick={() => navigate('/teacher/upload-pdf')}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition"
              >
                Upload PDF
              </button>
            </div>
          ) : (
            <>
              {/* Header Overview Card */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/60 border border-gray-100"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-600">
                        {trackingStats.subjectName}
                      </span>
                      <span>·</span>
                      <span className="text-xs text-gray-500">{trackingStats.unitTitle}</span>
                    </div>
                    <h2 className="text-base font-bold text-gray-900 truncate">
                      {trackingStats.pdfTitle}
                    </h2>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-red-500" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-600">Student Completion</span>
                    <span className="font-bold text-blue-600">{trackingStats.viewedPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${trackingStats.viewedPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Stat Metric Grid */}
                <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] font-medium text-gray-500 mb-0.5">Total</p>
                    <p className="text-lg font-bold text-gray-900">{trackingStats.totalStudents}</p>
                    <p className="text-[10px] text-gray-400">Enrolled</p>
                  </div>

                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] font-medium text-emerald-700 mb-0.5">Viewed</p>
                    <p className="text-lg font-bold text-emerald-600">{trackingStats.viewedCount}</p>
                    <p className="text-[10px] text-emerald-600/80">Students</p>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] font-medium text-amber-700 mb-0.5">Not Viewed</p>
                    <p className="text-lg font-bold text-amber-600">{trackingStats.notViewedCount}</p>
                    <p className="text-[10px] text-amber-600/80">Pending</p>
                  </div>
                </div>
              </motion.div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student by name or register number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm shadow-gray-200/30"
                />
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setTab('viewed')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    tab === 'viewed'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  Viewed ({filteredViewed.length})
                </button>

                <button
                  onClick={() => setTab('notViewed')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    tab === 'notViewed'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <Clock size={14} />
                  Not Viewed ({filteredNotViewed.length})
                </button>
              </div>

              {/* Student Lists */}
              {tab === 'viewed' && (
                <div className="space-y-2.5">
                  {filteredViewed.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                      <p className="text-sm font-semibold text-gray-700">
                        {searchTerm
                          ? 'No students found'
                          : trackingStats.totalStudents === 0
                          ? 'No students enrolled yet'
                          : 'No views recorded yet'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {searchTerm
                          ? 'No student matches your search query.'
                          : trackingStats.totalStudents === 0
                          ? 'Students registered for this department and semester will appear here.'
                          : 'No students have opened this PDF yet.'}
                      </p>
                    </div>
                  ) : (
                    filteredViewed.map((s, idx) => (
                      <motion.div
                        key={s.studentId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="bg-white rounded-2xl p-3.5 shadow-sm shadow-gray-200/50 border border-gray-100 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {s.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">{s.studentName}</h4>
                            <p className="text-[11px] text-gray-400">Reg: {s.registerNumber}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end flex-shrink-0">
                          <Badge color="green">Viewed</Badge>
                          <span className="text-[10px] text-gray-400 mt-1">
                            {formatViewedTime(s.viewedAt)}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {tab === 'notViewed' && (
                <div className="space-y-2.5">
                  {filteredNotViewed.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                      <p className="text-sm font-semibold text-gray-700">
                        {searchTerm
                          ? 'No students found'
                          : trackingStats.totalStudents === 0
                          ? 'No students enrolled yet'
                          : 'All caught up!'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {searchTerm
                          ? 'No student matches your search query.'
                          : trackingStats.totalStudents === 0
                          ? 'Students registered for this department and semester will appear here.'
                          : 'All enrolled students have viewed this PDF!'}
                      </p>
                    </div>
                  ) : (
                    filteredNotViewed.map((s, idx) => (
                      <motion.div
                        key={s.studentId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="bg-white rounded-2xl p-3.5 shadow-sm shadow-gray-200/50 border border-gray-100 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {s.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">{s.studentName}</h4>
                            <p className="text-[11px] text-gray-400">Reg: {s.registerNumber}</p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold flex-shrink-0">
                          Not Viewed
                        </span>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </PageContainer>

      <TeacherBottomNav />
    </>
  );
}
