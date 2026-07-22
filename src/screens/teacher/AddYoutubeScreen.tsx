import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Check, Youtube } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { subjects } from '@/data/subjects';

export default function AddYoutubeScreen() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [added, setAdded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <AppHeader title="Add YouTube Link" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          {added ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <Check size={40} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Link Added!</h2>
              <p className="text-sm text-gray-500">YouTube video has been linked successfully.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 rounded-2xl p-5 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Youtube size={24} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">YouTube Video Link</p>
                  <p className="text-xs text-gray-500">Paste a YouTube URL to add to a unit</p>
                </div>
              </motion.div>

              <Input
                label="YouTube URL"
                placeholder="https://www.youtube.com/watch?v=..."
                icon={<Link2 size={18} />}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Input
                label="Video Title"
                placeholder="e.g., DBMS - Full Course"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select a unit</option>
                  {subjects.find((s) => s.id === subject)?.units.map((u) => (
                    <option key={u.id} value={u.id}>Unit {u.number}: {u.title}</option>
                  ))}
                </select>
              </div>

              <Button fullWidth size="lg" type="submit">
                Add Video Link
              </Button>
            </form>
          )}
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
