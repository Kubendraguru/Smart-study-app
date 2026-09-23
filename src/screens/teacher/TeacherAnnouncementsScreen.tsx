import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, Check, Loader2 } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import AnnouncementCard from '@/components/cards/AnnouncementCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { getAnnouncements, createAnnouncement } from '@/service/announcements';
import { getSubjects } from '@/service/subject';
import type { Announcement } from '@/types';

export default function TeacherAnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [sent, setSent] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [annData, subjs] = await Promise.all([
        getAnnouncements(),
        getSubjects().catch(() => []),
      ]);
      setAnnouncements(annData);
      setSubjectsList(subjs || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const newAnn = await createAnnouncement({
        title,
        message,
        subjectId: subjectId || null,
        priority,
      });

      setAnnouncements((prev) => [newAnn, ...prev]);
      setTitle('');
      setMessage('');
      setSubjectId('');
      setPriority('medium');
      setShowForm(false);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err: any) {
      console.error('Error sending announcement:', err);
    } finally {
      setSubmitting(false);
    }
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
                <Input
                  label="Title"
                  placeholder="Announcement title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">General / All Subjects</option>
                    {subjectsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name || s.name}
                      </option>
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
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                          priority === p ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500'
                        }`}
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
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
                <Button fullWidth size="lg" type="submit" disabled={submitting}>
                  <span className="flex items-center justify-center gap-2">
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    Send Announcement
                  </span>
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={28} />
            </div>
          ) : announcements.length > 0 ? (
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
