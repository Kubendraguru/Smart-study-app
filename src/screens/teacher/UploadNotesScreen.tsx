import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Check } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { subjects } from '@/data/subjects';

export default function UploadNotesScreen() {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [content, setContent] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploaded(true);
    setTimeout(() => setUploaded(false), 2000);
  };

  return (
    <>
      <AppHeader title="Upload Notes" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          {uploaded ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <Check size={40} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Published!</h2>
              <p className="text-sm text-gray-500">Notes have been published successfully.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Notes Title"
                placeholder="e.g., Chapter 3 Summary"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write or paste your notes here..."
                  rows={8}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <Button fullWidth size="lg" type="submit">
                <span className="flex items-center justify-center gap-2">
                  <BookOpen size={18} />
                  Publish Notes
                </span>
              </Button>
            </form>
          )}
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
