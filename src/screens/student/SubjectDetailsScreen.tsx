import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, FileText, Video, HelpCircle, ClipboardList } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import UnitCard from '@/components/cards/UnitCard';
import ProgressBar from '@/components/ui/ProgressBar';
import Badge from '@/components/ui/Badge';
import { subjects } from '@/data/subjects';

const colorMap: Record<string, { bg: string; text: string; bar: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', bar: 'bg-violet-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', bar: 'bg-cyan-500' },
};

export default function SubjectDetailsScreen() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const subject = subjects.find((s) => s.id === subjectId);

  if (!subject) {
    return (
      <>
        <AppHeader title="Subject" showBack />
        <PageContainer showBottomNav>
          <div className="pt-20 text-center text-gray-500">Subject not found.</div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  const colors = colorMap[subject.color] || colorMap.blue;
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[subject.icon] || BookOpen;

  const totalPdfs = subject.units.reduce((sum, u) => sum + u.pdfs.length, 0);
  const totalVideos = subject.units.reduce((sum, u) => sum + u.videos.length, 0);
  const totalQuestions = subject.units.reduce((sum, u) => sum + u.importantQuestions.length, 0);
  const totalAssignments = subject.units.reduce((sum, u) => sum + u.assignments.length, 0);

  const stats = [
    { label: 'PDFs', value: totalPdfs, icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Videos', value: totalVideos, icon: Video, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Questions', value: totalQuestions, icon: HelpCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Assignments', value: totalAssignments, icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <>
      <AppHeader title={subject.code} showBack />
      <PageContainer showBottomNav noPadding>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${colors.bg.replace('50', '500')} from-blue-600 to-blue-700 px-4 pt-4 pb-6`}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
              <Icon size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white mb-1">{subject.name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-100">Semester {subject.semester}</span>
                <span className="text-blue-200">·</span>
                <span className="text-xs text-blue-100">{subject.credits} Credits</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-blue-50 leading-relaxed mb-4">{subject.description}</p>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-blue-100">Progress</span>
              <span className="font-semibold text-white">{subject.progress}%</span>
            </div>
            <ProgressBar value={subject.progress} color="bg-white" size="sm" />
          </div>
        </motion.div>

        <div className="px-4 pt-5">
          <div className="grid grid-cols-4 gap-3 mb-6">
            {stats.map((stat, i) => {
              const StatIcon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl p-3 text-center shadow-sm shadow-gray-200/60 border border-gray-100"
                >
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
                    <StatIcon size={16} className={stat.color} />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-[10px] text-gray-500">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-3">Units</h2>
          <div className="space-y-3">
            {subject.units.map((unit, i) => (
              <UnitCard key={unit.id} unit={unit} subjectId={subject.id} index={i} />
            ))}
          </div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
