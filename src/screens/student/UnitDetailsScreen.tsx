import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Video,
  ListVideo,
  ClipboardList,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Circle,
} from 'lucide-react';

import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import PdfCard from '@/components/cards/PdfCard';
import VideoCard from '@/components/cards/VideoCard';
import Badge from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import { getVideos } from '@/service/videos';
import { getAssignments } from '@/service/assignments';
import { getBooks } from '@/service/books';
import { isUnitCompleted, toggleUnitCompletion } from '@/service/progress';
import type { Video as VideoType, Book, Assignment } from '@/types';

type Tab = 'pdfs' | 'videos' | 'playlists' | 'assignments' | 'books';

type Unit = {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description: string | null;
  completed: boolean;
};

export default function UnitDetailsScreen() {
  const { subjectId, unitId } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('pdfs');
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);

  const [pdfs, setPdfs] = useState<any[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [playlists, setPlaylists] = useState<VideoType[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [togglingCompletion, setTogglingCompletion] = useState(false);

  useEffect(() => {
    loadUnit();
  }, [unitId, subjectId]);

  async function loadUnit() {
    if (!unitId || !subjectId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const isUuid = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      let resolvedUnitId = unitId;
      let resolvedTitle = `Unit`;
      let resolvedNum = 1;
      let resolvedDesc = '';

      // Parse unit number from placeholder if present
      const matchNum = unitId.match(/unit-(\d+)/i);
      if (matchNum) {
        resolvedNum = parseInt(matchNum[1], 10);
      }

      if (isUuid(unitId)) {
        const { data: dbUnit } = await supabase
          .from('units')
          .select('*')
          .eq('id', unitId)
          .maybeSingle();

        if (dbUnit) {
          resolvedUnitId = dbUnit.id;
          resolvedTitle = dbUnit.unit_title ?? dbUnit.title ?? `Unit ${dbUnit.unit_number}`;
          resolvedNum = dbUnit.unit_number;
          resolvedDesc = dbUnit.description ?? '';
        }
      } else if (subjectId) {
        // Try resolving by subjectId and unit number
        const { data: dbUnit } = await supabase
          .from('units')
          .select('*')
          .eq('subject_id', subjectId)
          .eq('unit_number', resolvedNum)
          .maybeSingle();

        if (dbUnit) {
          resolvedUnitId = dbUnit.id;
          resolvedTitle = dbUnit.unit_title ?? dbUnit.title ?? `Unit ${dbUnit.unit_number}`;
          resolvedNum = dbUnit.unit_number;
          resolvedDesc = dbUnit.description ?? '';
        } else {
          resolvedTitle = `Unit ${resolvedNum}: Syllabus Topics & Notes`;
          resolvedDesc = `Curriculum materials, lecture notes, and assignments will appear here once uploaded by your instructor.`;
        }
      }

      const isDone = await isUnitCompleted(resolvedUnitId);

      setUnit({
        id: resolvedUnitId,
        subject_id: subjectId,
        unit_number: resolvedNum,
        title: resolvedTitle,
        description: resolvedDesc,
        completed: isDone,
      });

      // 2. Fetch PDFs from materials
      const materialsPromise = isUuid(resolvedUnitId)
        ? supabase
            .from('materials')
            .select('*')
            .eq('unit_id', resolvedUnitId)
            .or('material_type.ilike.pdf,file_url.ilike.%.pdf')
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] });

      // 3. Fetch Single Videos & Playlists, Assignments, and Books
      const [materialsRes, allVids, assigns, bks] = await Promise.all([
        materialsPromise,
        getVideos(subjectId, isUuid(resolvedUnitId) ? resolvedUnitId : undefined),
        getAssignments({ subjectId, unitId: isUuid(resolvedUnitId) ? resolvedUnitId : undefined }),
        getBooks(subjectId, isUuid(resolvedUnitId) ? resolvedUnitId : undefined),
      ]);

      const formattedPdfs = (materialsRes.data ?? []).map((m: any) => ({
        id: m.id,
        title: m.title || 'PDF Material',
        size: 'PDF',
        pages: 1,
        uploadedBy: 'Instructor',
        uploadedAt: m.created_at ? new Date(m.created_at).toLocaleDateString() : '',
        url: m.file_url,
        file_url: m.file_url,
        bookmarked: false,
      }));
      setPdfs(formattedPdfs);

      const singleVideos = (allVids || []).filter((v) => !v.is_playlist && v.video_type !== 'playlist');
      const playlistVideos = (allVids || []).filter((v) => v.is_playlist || v.video_type === 'playlist');

      setVideos(singleVideos);
      setPlaylists(playlistVideos);
      setAssignments(assigns || []);
      setBooks(bks || []);
    } catch (error) {
      console.error('Unexpected error loading unit:', error);
      setUnit(null);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleCompletion = async () => {
    if (!unit || togglingCompletion) return;
    const nextState = !unit.completed;
    setUnit((prev) => (prev ? { ...prev, completed: nextState } : null));
    setTogglingCompletion(true);
    const res = await toggleUnitCompletion(unit.id, nextState);
    if (!res.success) {
      // Revert state if failed
      setUnit((prev) => (prev ? { ...prev, completed: !nextState } : null));
    }
    setTogglingCompletion(false);
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Unit" showBack />
        <PageContainer showBottomNav>
          <div className="pt-20 text-center">
            <p className="text-sm text-gray-500">Loading unit resources...</p>
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  if (!unit) {
    return (
      <>
        <AppHeader title="Unit" showBack />
        <PageContainer showBottomNav>
          <div className="pt-20 text-center">
            <p className="text-sm text-gray-500">Unit not found.</p>
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

  const tabs: {
    id: Tab;
    label: string;
    icon: any;
    count: number;
  }[] = [
    { id: 'pdfs', label: 'PDFs', icon: FileText, count: pdfs.length },
    { id: 'videos', label: 'Videos', icon: Video, count: videos.length },
    { id: 'playlists', label: 'Playlists', icon: ListVideo, count: playlists.length },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList, count: assignments.length },
    { id: 'books', label: 'Books', icon: BookOpen, count: books.length },
  ];

  return (
    <>
      <AppHeader title={`Unit ${unit.unit_number}`} showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          {/* Unit information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Badge color="blue">Unit {unit.unit_number}</Badge>
                {unit.completed && <Badge color="green">Completed ✓</Badge>}
              </div>

              {/* Mark Completed Toggle Button */}
              <button
                onClick={handleToggleCompletion}
                disabled={togglingCompletion}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  unit.completed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {unit.completed ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Completed</span>
                  </>
                ) : (
                  <>
                    <Circle size={14} className="text-gray-400" />
                    <span>Mark as Completed</span>
                  </>
                )}
              </button>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-1">{unit.title}</h2>
            {unit.description && (
              <p className="text-sm text-gray-500 leading-relaxed">{unit.description}</p>
            )}
          </motion.div>

          {/* 5-Resource Tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((t) => {
              const TabIcon = t.icon;
              const isActive = tab === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <TabIcon size={15} />
                  {t.label}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20' : 'bg-gray-200'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* PDFs */}
            {tab === 'pdfs' && (
              <div className="space-y-3">
                {pdfs.length === 0 ? (
                  <EmptyState message="No PDFs available for this unit yet." />
                ) : (
                  pdfs.map((pdf, i) => (
                    <PdfCard
                      key={pdf.id}
                      pdf={pdf}
                      index={i}
                      onClick={() =>
                        navigate(`/pdf/${pdf.id}`, {
                          state: { pdf, subjectName: unit.title },
                        })
                      }
                    />
                  ))
                )}
              </div>
            )}

            {/* Single Videos */}
            {tab === 'videos' && (
              <div className="grid grid-cols-2 gap-3">
                {videos.length === 0 ? (
                  <div className="col-span-2">
                    <EmptyState message="No single video lectures linked yet." />
                  </div>
                ) : (
                  videos.map((video, i) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      index={i}
                      onClick={() => navigate(`/youtube/${video.id}`)}
                    />
                  ))
                )}
              </div>
            )}

            {/* Playlists */}
            {tab === 'playlists' && (
              <div className="space-y-3">
                {playlists.length === 0 ? (
                  <EmptyState message="No YouTube playlists attached to this unit." />
                ) : (
                  playlists.map((pl, i) => (
                    <motion.a
                      key={pl.id}
                      href={pl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all block"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                          <ListVideo size={22} className="text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{pl.title}</h4>
                          <p className="text-xs text-gray-500">{pl.channel || 'YouTube Course'}</p>
                          <span className="inline-block mt-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                            {pl.duration || 'Full Course Playlist'}
                          </span>
                        </div>
                      </div>
                      <ExternalLink size={16} className="text-gray-400" />
                    </motion.a>
                  ))
                )}
              </div>
            )}

            {/* Assignments */}
            {tab === 'assignments' && (
              <div className="space-y-3">
                {assignments.length === 0 ? (
                  <EmptyState message="No assignments published for this unit." />
                ) : (
                  assignments.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <ClipboardList size={18} className="text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-sm mb-1">{a.title}</h4>
                          {a.description && (
                            <p className="text-xs text-gray-600 mb-2 leading-relaxed">{a.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                            <span className="flex items-center gap-1 text-amber-700 font-semibold">
                              <Calendar size={12} />
                              Due: {a.due_date} {a.due_time || ''}
                            </span>
                            <span className="font-bold text-emerald-600">{a.max_marks} Marks</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Books */}
            {tab === 'books' && (
              <div className="space-y-3">
                {books.length === 0 ? (
                  <EmptyState message="No textbooks recommended for this unit yet." />
                ) : (
                  books.map((b, i) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <BookOpen size={20} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-sm">{b.title}</h4>
                          {b.author && <p className="text-xs text-gray-500">by {b.author}</p>}
                          {b.edition && (
                            <span className="inline-block text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md mt-1 mb-1">
                              {b.edition}
                            </span>
                          )}
                          {b.description && (
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{b.description}</p>
                          )}
                          {b.file_url && (
                            <a
                              href={b.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline mt-2"
                            >
                              <ExternalLink size={12} />
                              View Reference
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 p-6">
      <p className="text-sm font-semibold text-gray-700">{message}</p>
      <p className="text-xs text-gray-400 mt-1">Resources uploaded by teachers will appear here.</p>
    </div>
  );
}