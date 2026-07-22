import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, GraduationCap, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import BottomNav from '@/components/layout/BottomNav';
import SubjectCard from '@/components/cards/SubjectCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Avatar from '@/components/ui/Avatar';
import { subjects } from '@/data/subjects';
import { notifications } from '@/data/notifications';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const unreadCount = notifications.filter((n) => !n.read).length;

  const continueLearning = subjects.filter((s) => s.progress > 0 && s.progress < 100).slice(0, 2);
  const recentlyViewed = subjects.slice(0, 3);
  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageContainer showBottomNav>
        <div className="pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Avatar name="Arun Kumar" size="md" />
              <div>
                <p className="text-xs text-gray-500">Welcome back,</p>
                <h1 className="text-base font-bold text-gray-900">Arun Kumar</h1>
              </div>
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative mb-6">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects, units, topics..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 mb-6 shadow-lg shadow-blue-600/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={18} className="text-white" />
              <span className="text-xs font-medium text-blue-100">Semester 5</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-3">Your Progress</h2>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-3xl font-bold text-white">38%</p>
                <p className="text-xs text-blue-100">Overall completion</p>
              </div>
              <div className="flex-1 flex justify-end">
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{subjects.length}</p>
                  <p className="text-xs text-blue-100">Subjects</p>
                </div>
              </div>
            </div>
          </motion.div>

          {continueLearning.length > 0 && (
            <div className="mb-6">
              <SectionHeader title="Continue Learning" onActionClick={() => navigate('/semester/5')} />
              <div className="space-y-3">
                {continueLearning.map((subject, i) => (
                  <motion.button
                    key={subject.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/subject/${subject.id}`)}
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{subject.name}</h3>
                      <p className="text-xs text-gray-500">Pick up where you left off</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <SectionHeader title="Recently Viewed" onActionClick={() => navigate('/semester/5')} />
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {recentlyViewed.map((subject, i) => (
                <div key={subject.id} className="w-44 flex-shrink-0">
                  <SubjectCard subject={subject} index={i} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="Your Subjects" onActionClick={() => navigate('/semester/5')} />
            <div className="space-y-3">
              {filteredSubjects.map((subject, i) => (
                <SubjectCard key={subject.id} subject={subject} index={i} />
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
