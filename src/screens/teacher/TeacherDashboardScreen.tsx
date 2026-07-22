import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Video, BookOpen, Bell, Upload, ClipboardList,
  Users, TrendingUp, Plus, Link2,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import { subjects } from '@/data/subjects';
import { announcements } from '@/data/announcements';

const quickActions = [
  { label: 'Upload PDF', icon: FileText, path: '/teacher/upload-pdf', color: 'text-red-500', bg: 'bg-red-50' },
  { label: 'Upload Notes', icon: BookOpen, path: '/teacher/upload-notes', color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: 'Add Subject', icon: Plus, path: '/teacher/add-subject', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { label: 'Add Unit', icon: BookOpen, path: '/teacher/add-unit', color: 'text-amber-500', bg: 'bg-amber-50' },
  { label: 'YouTube Link', icon: Link2, path: '/teacher/add-youtube', color: 'text-cyan-500', bg: 'bg-cyan-50' },
  { label: 'Announce', icon: Bell, path: '/teacher/announcements', color: 'text-violet-500', bg: 'bg-violet-50' },
];

const stats = [
  { label: 'Subjects', value: subjects.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Materials', value: subjects.reduce((s, sub) => s + sub.units.reduce((u, un) => u + un.pdfs.length, 0), 0), icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
  { label: 'Videos', value: subjects.reduce((s, sub) => s + sub.units.reduce((u, un) => u + un.videos.length, 0), 0), icon: Video, color: 'text-cyan-500', bg: 'bg-cyan-50' },
  { label: 'Students', value: 248, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

export default function TeacherDashboardScreen() {
  const navigate = useNavigate();

  return (
    <>
      <AppHeader title="Teacher Dashboard" />
      <PageContainer showBottomNav>
        <div className="pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 mb-5 shadow-lg shadow-blue-600/20"
          >
            <p className="text-xs text-blue-100 mb-1">Good morning,</p>
            <h2 className="text-xl font-bold text-white mb-3">Prof. Rajesh Kumar</h2>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold text-white">{stats[3].value}</p>
                <p className="text-xs text-blue-100">Active students</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">{announcements.length}</p>
                <p className="text-xs text-blue-100">Announcements</p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-4 gap-2.5 mb-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl p-3 text-center shadow-sm shadow-gray-200/60 border border-gray-100"
                >
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
                    <Icon size={14} className={stat.color} />
                  </div>
                  <p className="text-base font-bold text-gray-900">{stat.value}</p>
                  <p className="text-[10px] text-gray-500">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(action.path)}
                  className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm shadow-gray-200/60 border border-gray-100 hover:shadow-md hover:shadow-gray-200 transition-all"
                >
                  <div className={`w-11 h-11 rounded-xl ${action.bg} flex items-center justify-center`}>
                    <Icon size={20} className={action.color} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">{action.label}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Your Subjects</h2>
            <button
              onClick={() => navigate('/teacher/manage-materials')}
              className="text-sm font-medium text-blue-600"
            >
              Manage
            </button>
          </div>
          <div className="space-y-3">
            {subjects.slice(0, 3).map((subject, i) => (
              <motion.button
                key={subject.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/subject/${subject.id}`)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{subject.name}</h3>
                  <p className="text-xs text-gray-500">{subject.units.length} units · {subject.units.reduce((s, u) => s + u.pdfs.length, 0)} materials</p>
                </div>
                <TrendingUp size={16} className="text-gray-300" />
              </motion.button>
            ))}
          </div>
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
