import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Video, BookOpen, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import EmptyState from '@/components/ui/EmptyState';
import { subjects } from '@/data/subjects';

type Tab = 'pdfs' | 'videos' | 'units';

export default function ManageMaterialsScreen() {
  const [tab, setTab] = useState<Tab>('pdfs');

  const allPdfs: { title: string; subject: string; size: string; id: string }[] = [];
  const allVideos: { title: string; subject: string; duration: string; id: string }[] = [];
  const allUnits: { title: string; subject: string; number: number; id: string }[] = [];

  subjects.forEach((subject) => {
    subject.units.forEach((unit) => {
      unit.pdfs.forEach((pdf) => allPdfs.push({ title: pdf.title, subject: subject.name, size: pdf.size, id: pdf.id }));
      unit.videos.forEach((video) => allVideos.push({ title: video.title, subject: subject.name, duration: video.duration, id: video.id }));
      allUnits.push({ title: unit.title, subject: subject.name, number: unit.number, id: unit.id });
    });
  });

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'pdfs', label: 'PDFs', count: allPdfs.length },
    { id: 'videos', label: 'Videos', count: allVideos.length },
    { id: 'units', label: 'Units', count: allUnits.length },
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
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'bg-gray-50 text-gray-500'}`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {tab === 'pdfs' && (
            <div className="space-y-3">
              {allPdfs.length > 0 ? (
                allPdfs.map((pdf, i) => (
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
                      <p className="text-xs text-gray-500">{pdf.subject} · {pdf.size}</p>
                    </div>
                    <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-50">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 rounded-lg text-red-400 hover:bg-red-50">
                      <Trash2 size={16} />
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
              {allVideos.length > 0 ? (
                allVideos.map((video, i) => (
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
                      <p className="text-xs text-gray-500">{video.subject} · {video.duration}</p>
                    </div>
                    <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-50">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 rounded-lg text-red-400 hover:bg-red-50">
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
              {allUnits.length > 0 ? (
                allUnits.map((unit, i) => (
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
                      <h3 className="font-semibold text-gray-900 text-sm truncate">Unit {unit.number}: {unit.title}</h3>
                      <p className="text-xs text-gray-500">{unit.subject}</p>
                    </div>
                    <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-50">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 rounded-lg text-red-400 hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))
              ) : (
                <EmptyState icon={BookOpen} title="No units" message="Add units to see them here." />
              )}
            </div>
          )}
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
