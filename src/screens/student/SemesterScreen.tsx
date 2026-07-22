import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, BookOpen } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import SubjectCard from '@/components/cards/SubjectCard';
import ProgressBar from '@/components/ui/ProgressBar';
import { subjects } from '@/data/subjects';

export default function SemesterScreen() {
  const navigate = useNavigate();
  const semesterSubjects = subjects;
  const overallProgress = Math.round(
    semesterSubjects.reduce((sum, s) => sum + s.progress, 0) / semesterSubjects.length
  );

  return (
    <>
      <AppHeader title="Semester 5" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/60 border border-gray-100 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} className="text-blue-600" />
                  <span className="text-xs font-medium text-gray-500">Academic Year 2024-25</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Semester 5</h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{overallProgress}%</p>
                <p className="text-xs text-gray-500">Overall</p>
              </div>
            </div>
            <ProgressBar value={overallProgress} showLabel />
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-gray-400" />
                <span className="text-xs text-gray-600">{semesterSubjects.length} Subjects</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">
                  {semesterSubjects.reduce((sum, s) => sum + s.units.length, 0)} Units
                </span>
              </div>
            </div>
          </motion.div>

          <div className="space-y-3">
            {semesterSubjects.map((subject, i) => (
              <SubjectCard key={subject.id} subject={subject} index={i} />
            ))}
          </div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
