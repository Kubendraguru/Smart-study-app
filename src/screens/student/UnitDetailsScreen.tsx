import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Video, HelpCircle, ClipboardList, BookOpen } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import PdfCard from '@/components/cards/PdfCard';
import VideoCard from '@/components/cards/VideoCard';
import Badge from '@/components/ui/Badge';
import { subjects } from '@/data/subjects';

type Tab = 'pdfs' | 'videos' | 'questions' | 'assignments';

export default function UnitDetailsScreen() {
  const { subjectId, unitId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pdfs');

  const subject = subjects.find((s) => s.id === subjectId);
  const unit = subject?.units.find((u) => u.id === unitId);

  if (!subject || !unit) {
    return (
      <>
        <AppHeader title="Unit" showBack />
        <PageContainer showBottomNav>
          <div className="pt-20 text-center text-gray-500">Unit not found.</div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof FileText; count: number }[] = [
    { id: 'pdfs', label: 'PDFs', icon: FileText, count: unit.pdfs.length },
    { id: 'videos', label: 'Videos', icon: Video, count: unit.videos.length },
    { id: 'questions', label: 'Questions', icon: HelpCircle, count: unit.importantQuestions.length },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList, count: unit.assignments.length },
  ];

  return (
    <>
      <AppHeader title={`Unit ${unit.number}`} showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/60 border border-gray-100 mb-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge color="blue">Unit {unit.number}</Badge>
              {unit.completed && <Badge color="green">Completed</Badge>}
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{unit.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{unit.description}</p>
          </motion.div>

          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((t) => {
              const TabIcon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${isActive ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'bg-gray-50 text-gray-500'}`}
                >
                  <TabIcon size={15} />
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'pdfs' && (
              <div className="space-y-3">
                {unit.pdfs.map((pdf, i) => (
                  <PdfCard key={pdf.id} pdf={pdf} index={i} onClick={() => navigate(`/pdf/${pdf.id}`)} />
                ))}
              </div>
            )}
            {tab === 'videos' && (
              <div className="grid grid-cols-2 gap-3">
                {unit.videos.map((video, i) => (
                  <VideoCard key={video.id} video={video} index={i} onClick={() => navigate(`/youtube/${video.id}`)} />
                ))}
              </div>
            )}
            {tab === 'questions' && (
              <div className="space-y-3">
                {unit.importantQuestions.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-amber-600">Q{i + 1}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{q}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === 'assignments' && (
              <div className="space-y-3">
                {unit.assignments.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={16} className="text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">{a}</p>
                        <Badge color="green">Pending</Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
