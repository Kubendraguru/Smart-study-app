import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Check, Loader2 } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { getSubjects } from '@/service/subject';
import { addBook } from '@/service/books';
import { supabase } from '@/lib/supabase';

export default function UploadNotesScreen() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [unitsList, setUnitsList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const subjs = await getSubjects();
        setSubjectsList(subjs || []);
        if (subjs && subjs.length > 0) {
          setSubjectId(subjs[0].id);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadUnits() {
      if (!subjectId) {
        setUnitsList([]);
        setUnitId('');
        return;
      }
      try {
        const { data } = await supabase
          .from('units')
          .select('*')
          .eq('subject_id', subjectId)
          .order('unit_number', { ascending: true });

        setUnitsList(data || []);
        if (data && data.length > 0) {
          setUnitId(data[0].id);
        } else {
          setUnitId('');
        }
      } catch (err) {
        console.error('Error loading units:', err);
      }
    }
    loadUnits();
  }, [subjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;

    setSubmitting(true);
    try {
      await addBook({
        title,
        author: author || undefined,
        subjectId,
        unitId: unitId || undefined,
        description: description || undefined,
        fileUrl: fileUrl || undefined,
      });

      setUploaded(true);
      setTitle('');
      setAuthor('');
      setDescription('');
      setFileUrl('');
      setTimeout(() => setUploaded(false), 2500);
    } catch (err: any) {
      console.error('Error adding textbook / notes:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title="Upload Notes & Books" showBack />
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
              <p className="text-sm text-gray-500">Book / Notes have been published successfully.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Book / Notes Title"
                placeholder="e.g., Operating Systems Concepts (Silberschatz)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Input
                label="Author / Publication (Optional)"
                placeholder="e.g., Abraham Silberschatz, Peter Baer Galvin"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select a subject</option>
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_name || s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit (Optional)</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Entire Subject / Reference</option>
                  {unitsList.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number}: {u.unit_title || `Unit ${u.unit_number}`}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Reference Link / File URL (Optional)"
                placeholder="https://..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description / Chapter Highlights</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key topics, chapters covered, or study tips..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <Button fullWidth size="lg" type="submit" disabled={submitting}>
                <span className="flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <BookOpen size={18} />}
                  Publish Textbook / Notes
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
