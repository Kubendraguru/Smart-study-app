import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Video,
  BookOpen,
  Bell,
  Plus,
  Link2,
  Eye,
  ClipboardList,
  Book as BookIcon,
  Settings,
  Layers,
  GraduationCap,
  Users,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import { useAuth } from '@/context/AuthContext';
import { getProfile } from '@/service/auth';
import { getSubjects } from '@/service/subject';
import { supabase } from '@/lib/supabase';

const quickActions = [
  { label: 'Add Subject', icon: Plus, path: '/teacher/add-subject', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Add Unit', icon: Layers, path: '/teacher/add-unit', color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Upload PDF', icon: FileText, path: '/teacher/upload-pdf', color: 'text-red-500', bg: 'bg-red-50' },
  { label: 'Video / Playlist', icon: Link2, path: '/teacher/add-youtube', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { label: 'Assignments', icon: ClipboardList, path: '/teacher/assignments', color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Books & Refs', icon: BookIcon, path: '/teacher/books', color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Announcements', icon: Bell, path: '/teacher/announcements', color: 'text-violet-500', bg: 'bg-violet-50' },
  { label: 'View Tracking', icon: Eye, path: '/teacher/tracking', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { label: 'Settings', icon: Settings, path: '/teacher/settings', color: 'text-gray-700', bg: 'bg-gray-100' },
];

export default function TeacherDashboardScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [teacherName, setTeacherName] = useState('Faculty Member');
  const [designation, setDesignation] = useState('Faculty Member');
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    subjectsCount: 0,
    materialsCount: 0,
    videosCount: 0,
    assignmentsCount: 0,
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [profile, subjs] = await Promise.all([
          getProfile(user.id),
          getSubjects(),
        ]);

        if (profile?.full_name) setTeacherName(profile.full_name);
        if (profile?.designation) setDesignation(profile.designation);

        setSubjectsList(subjs || []);

        // Count materials & videos
        const [materialsRes, videosRes, assignmentsRes] = await Promise.all([
          supabase.from('materials').select('id', { count: 'exact', head: true }),
          supabase.from('videos').select('id', { count: 'exact', head: true }),
          supabase.from('assignments').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          subjectsCount: subjs ? subjs.length : 0,
          materialsCount: materialsRes.count || 0,
          videosCount: videosRes.count || 0,
          assignmentsCount: assignmentsRes.count || 0,
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    }
    loadData();
  }, [user]);

  return (
    <>
      <AppHeader title="Teacher Dashboard" />
      <PageContainer showBottomNav>
        <div className="pt-4">
          {/* Welcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 mb-5 shadow-lg shadow-blue-600/20"
          >
            <p className="text-xs text-blue-100 mb-1">{designation}</p>
            <h2 className="text-xl font-bold text-white mb-3">{teacherName}</h2>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold text-white">{stats.subjectsCount}</p>
                <p className="text-xs text-blue-100">Subjects</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.materialsCount}</p>
                <p className="text-xs text-blue-100">Materials</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.assignmentsCount}</p>
                <p className="text-xs text-blue-100">Assignments</p>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions Grid */}
          <h2 className="text-lg font-bold text-gray-900 mb-3">Curriculum Management</h2>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(action.path)}
                  className="bg-white rounded-2xl p-3.5 flex flex-col items-center gap-2 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className={`w-11 h-11 rounded-xl ${action.bg} flex items-center justify-center`}>
                    <Icon size={20} className={action.color} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{action.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Curriculum Subjects */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Your Subjects</h2>
            <button
              onClick={() => navigate('/teacher/manage-materials')}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Manage All
            </button>
          </div>

          <div className="space-y-3">
            {subjectsList.slice(0, 5).map((subject, i) => (
              <motion.button
                key={subject.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/subject/${subject.id}`)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm truncate">
                    {subject.subject_code ? `${subject.subject_code} — ` : ''}{subject.subject_name || subject.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Semester {subject.semester} · {subject.department || 'All Branches'} · {subject.credits || 3} Credits
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
