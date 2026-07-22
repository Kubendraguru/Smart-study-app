import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, UploadCloud, Check } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { subjects } from '@/data/subjects';

export default function UploadPdfScreen() {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploaded(true);
    setTimeout(() => setUploaded(false), 2000);
  };

  return (
    <>
      <AppHeader title="Upload PDF" showBack />
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
              <h2 className="text-lg font-bold text-gray-900 mb-1">Uploaded!</h2>
              <p className="text-sm text-gray-500">PDF has been uploaded successfully.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud size={28} className="text-blue-500" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {file ? file.name : 'Tap to select a PDF file'}
                </p>
                <p className="text-xs text-gray-400 mb-4">Max size: 50 MB</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                  <FileText size={16} />
                  Choose File
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </motion.div>

              <Input
                label="Title"
                placeholder="e.g., Database Design - Complete Notes"
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
                Upload PDF
              </Button>
            </form>
          )}
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
