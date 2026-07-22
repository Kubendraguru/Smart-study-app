import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Settings, ChevronRight, GraduationCap, Bookmark, Bell, Download,
  HelpCircle, LogOut, Moon, Globe, Shield, BrainCircuit,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { subjects } from '@/data/subjects';

const menuSections = [
  {
    title: 'Learning',
    items: [
      { icon: GraduationCap, label: 'My Subjects', color: 'text-blue-600', bg: 'bg-blue-50' },
      { icon: Bookmark, label: 'Bookmarks', color: 'text-amber-600', bg: 'bg-amber-50' },
      { icon: Download, label: 'Downloads', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { icon: BrainCircuit, label: 'AI Assistant', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', color: 'text-red-600', bg: 'bg-red-50' },
      { icon: Moon, label: 'Appearance', color: 'text-violet-600', bg: 'bg-violet-50' },
      { icon: Globe, label: 'Language', color: 'text-cyan-600', bg: 'bg-cyan-50' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help & FAQ', color: 'text-blue-600', bg: 'bg-blue-50' },
      { icon: Shield, label: 'Privacy & Security', color: 'text-gray-600', bg: 'bg-gray-100' },
      { icon: Settings, label: 'Settings', color: 'text-gray-600', bg: 'bg-gray-100' },
    ],
  },
];

export default function ProfileScreen() {
  const navigate = useNavigate();
  const overallProgress = Math.round(
    subjects.reduce((sum, s) => sum + s.progress, 0) / subjects.length
  );

  return (
    <>
      <AppHeader title="Profile" />
      <PageContainer showBottomNav>
        <div className="pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/60 border border-gray-100 mb-5"
          >
            <div className="flex items-center gap-4 mb-4">
              <Avatar name="Arun Kumar" size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Arun Kumar</h2>
                <p className="text-sm text-gray-500">arun@annauniv.edu.in</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge color="blue">Student</Badge>
                  <Badge color="gray">Semester 5</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{subjects.length}</p>
                <p className="text-xs text-gray-500">Subjects</p>
              </div>
              <div className="text-center border-x border-gray-100">
                <p className="text-xl font-bold text-gray-900">{overallProgress}%</p>
                <p className="text-xs text-gray-500">Progress</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">12</p>
                <p className="text-xs text-gray-500">Bookmarks</p>
              </div>
            </div>
          </motion.div>

          {menuSections.map((section, sIdx) => (
            <div key={section.title} className="mb-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {section.title}
              </h3>
              <div className="bg-white rounded-2xl shadow-sm shadow-gray-200/60 border border-gray-100 overflow-hidden">
                {section.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sIdx * 0.05 + i * 0.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (item.label === 'My Subjects') navigate('/semester/5');
                        else if (item.label === 'Bookmarks') navigate('/bookmarks');
                        else if (item.label === 'AI Assistant') navigate('/ai-assistant');
                      }}
                      className={`w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 transition-colors ${i !== section.items.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                      <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={18} className={item.color} />
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-gray-700">{item.label}</span>
                      <ChevronRight size={18} className="text-gray-300" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-red-500 font-semibold text-sm rounded-2xl border border-gray-100 shadow-sm shadow-gray-200/60 hover:bg-red-50 transition-colors mb-4"
          >
            <LogOut size={18} />
            Sign Out
          </button>

          <p className="text-center text-xs text-gray-400">Anna University Study Hub v1.0.0</p>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
