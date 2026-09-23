import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Video, BookOpen, Trash2, Edit2, Eye, Loader2 } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import EmptyState from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';
import { subjects as initialSubjects } from '@/data/subjects';
import { deleteVideo } from '@/service/videos';

type Tab = 'pdfs' | 'videos' | 'units';

export default function ManageMaterialsScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pdfs');
  const [loading, setLoading] = useState(true);
  const [pdfs, setPdfs] = useState<{ title: string; subject: string; size: string; id: string }[]>([]);
  const [videos, setVideos] = useState<{ title: string; subject: string; duration: string; id: string; url: string }[]>([]);
  const [units, setUnits] = useState<{ title: string; subject: string; number: number; id: string }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch PDFs
      const { data: mats } = await supabase
        .from('materials')
        .select(`
          id,
          title,
          file_url,
          units (
            unit_title,
            unit_number,
            subjects (
              subject_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (mats && mats.length > 0) {
        setPdfs(
          mats.map((m: any) => ({
            id: m.id,
            title: m.title || 'PDF Document',
            subject: m.units?.subjects?.subject_name || 'Subject',
            size: '2.4 MB',
          }))
        );
      } else {
        const staticPdfs: any[] = [];
        initialSubjects.forEach((s) => {
          s.units.forEach((u) => {
            u.pdfs.forEach((p) => staticPdfs.push({ title: p.title, subject: s.name, size: p.size, id: p.id }));
          });
        });
        setPdfs(staticPdfs);
      }

      // 2. Fetch Videos
      const { data: vids } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          url,
          duration,
          subjects (
            subject_name
          )
        `)
        .order('created_at', { ascending: false });

      if (vids && vids.length > 0) {
        setVideos(
          vids.map((v: any) => ({
            id: v.id,
            title: v.title,
            subject: v.subjects?.subject_name || 'Subject',
            duration: v.duration || '15:00',
            url: v.url,
          }))
        );
      } else {
        const staticVideos: any[] = [];
        initialSubjects.forEach((s) => {
          s.units.forEach((u) => {
            u.videos.forEach((v) =>
              staticVideos.push({ title: v.title, subject: s.name, duration: v.duration, id: v.id, url: v.url })
            );
          });
        });
        setVideos(staticVideos);
      }

      // 3. Fetch Units
      const { data: unitsData } = await supabase
        .from('units')
        .select(`
          id,
          unit_title,
          unit_number,
          subjects (
            subject_name
          )
        `)
        .order('unit_number', { ascending: true });

      if (unitsData && unitsData.length > 0) {
        setUnits(
          unitsData.map((u: any) => ({
            id: u.id,
            title: u.unit_title || `Unit ${u.unit_number}`,
            subject: u.subjects?.subject_name || 'Subject',
            number: u.unit_number,
          }))
        );
      } else {
        const staticUnits: any[] = [];
        initialSubjects.forEach((s) => {
          s.units.forEach((u) => {
            staticUnits.push({ title: u.title, subject: s.name, number: u.number, id: u.id });
          });
        });
        setUnits(staticUnits);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteVideo = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this video link?')) return;
    try {
      await deleteVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'pdfs', label: 'PDFs', count: pdfs.length },
    { id: 'videos', label: 'Videos', count: videos.length },
    { id: 'units', label: 'Units', count: units.length },
  ];

  return (
    <>
      <AppHeader title="Manage Materials" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  tab === t.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={28} />
            </div>
          ) : (
            <>
              {tab === 'pdfs' && (
                <div className="space-y-3">
                  {pdfs.length > 0 ? (
                    pdfs.map((pdf, i) => (
                      <motion.div
                        key={pdf.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{pdf.title}</h3>
                          <p className="text-xs text-gray-500">
                            {pdf.subject} · {pdf.size}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/teacher/tracking?pdfId=${pdf.id}`)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View Student Tracking"
                        >
                          <Eye size={16} />
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState icon={FileText} title="No PDFs" message="Upload PDFs to see them here." />
                  )}
                </div>
              )}

              {tab === 'videos' && (
                <div className="space-y-3">
                  {videos.length > 0 ? (
                    videos.map((video, i) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Video size={18} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{video.title}</h3>
                          <p className="text-xs text-gray-500">
                            {video.subject} · {video.duration}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState icon={Video} title="No videos" message="Add YouTube links to see them here." />
                  )}
                </div>
              )}

              {tab === 'units' && (
                <div className="space-y-3">
                  {units.length > 0 ? (
                    units.map((unit, i) => (
                      <motion.div
                        key={unit.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <BookOpen size={18} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            Unit {unit.number}: {unit.title}
                          </h3>
                          <p className="text-xs text-gray-500">{unit.subject}</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState icon={BookOpen} title="No units" message="Add units to see them here." />
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
