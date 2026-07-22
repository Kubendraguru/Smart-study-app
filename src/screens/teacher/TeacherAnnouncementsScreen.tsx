import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, Check } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import AnnouncementCard from '@/components/cards/AnnouncementCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { announcements as initialAnnouncements } from '@/data/announcements';
import { subjects } from '@/data/subjects';
import type { Announcement } from '@/types';

export default function TeacherAnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAnnouncement: Announcement = {
      id: `a${Date.now()}`,
      title,
      message,
      date: new Date().toISOString().split('T')[0],
      subject: subjects.find((s) => s.id === subject)?.name || 'General',
      priority,
      read: false,
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    setTitle('');
    setMessage('');
    setSubject('');
    setPriority('medium');
    setShowForm(false);
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <>
      <AppHeader
        title="Announcements"
        showBack
        rightAction={
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white"
          >
            <Plus size={18} />
          </button>
        }
      />
      <PageContainer showBottomNav>
        <div className="pt-4">
          {sent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 text-emerald-700 text-sm font-medium px-4 py-3 rounded-xl mb-4 flex items-center gap-2"
            >
              <Check size={16} />
              Announcement sent to all students!
            </motion.div>
          )}

          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/60 border border-gray-100 mb-5 space-y-4 overflow-hidden"
              >
                <Input label="Title" placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    {(['high', 'medium', 'low'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${priority === p ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your announcement..."
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
                <Button fullWidth size="lg" type="submit">
                  <span className="flex items-center justify-center gap-2">
                    <Send size={18} />
                    Send Announcement
                  </span>
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((announcement, i) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Plus} title="No announcements" message="Create an announcement to notify your students." />
          )}
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
