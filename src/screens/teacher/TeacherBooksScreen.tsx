import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Trash2,
  ExternalLink,
  X,
  Loader2,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { getBooks, addBook, deleteBook } from '@/service/books';
import { getSubjects } from '@/service/subject';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types';

export default function TeacherBooksScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [edition, setEdition] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [purchaseLink, setPurchaseLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [bks, subjs] = await Promise.all([
        getBooks(),
        getSubjects(),
      ]);
      setBooks(bks);
      setSubjects(subjs);
      if (subjs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subjs[0].id);
      }
    } catch (err) {
      console.error('Error loading books:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadUnits() {
      if (!selectedSubjectId) {
        setUnits([]);
        setSelectedUnitId('');
        return;
      }
      try {
        const { data } = await supabase
          .from('units')
          .select('*')
          .eq('subject_id', selectedSubjectId)
          .order('unit_number', { ascending: true });
        setUnits(data || []);
        if (data && data.length > 0) {
          setSelectedUnitId(data[0].id);
        } else {
          setSelectedUnitId('');
        }
      } catch (err) {
        console.error('Error loading units:', err);
      }
    }
    loadUnits();
  }, [selectedSubjectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSubjectId) return;

    setSubmitting(true);
    try {
      await addBook({
        title: title.trim(),
        subjectId: selectedSubjectId,
        unitId: selectedUnitId || null,
        author: author.trim() || undefined,
        edition: edition.trim() || undefined,
        description: description.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        purchaseLink: purchaseLink.trim() || undefined,
      });

      setShowModal(false);
      setTitle('');
      setAuthor('');
      setEdition('');
      setDescription('');
      setFileUrl('');
      setPurchaseLink('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add textbook.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, bookTitle: string) => {
    if (!window.confirm(`Are you sure you want to remove "${bookTitle}"?`)) return;
    try {
      await deleteBook(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete book.');
    }
  };

  return (
    <>
      <AppHeader title="Manage Textbooks & Notes" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recommended Books ({books.length})</h2>
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus size={16} className="mr-1" />
              Add Book
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
              Loading textbooks...
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6">
              <BookOpen size={40} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">No Textbooks Added</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                Add recommended syllabus textbooks and reference links for your students.
              </p>
              <Button size="sm" onClick={() => setShowModal(true)}>
                <Plus size={16} className="mr-1" />
                Add First Book
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {books.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                        {item.author && <p className="text-xs text-gray-500">by {item.author}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {item.edition && (
                    <span className="inline-block text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md mb-2">
                      Edition: {item.edition}
                    </span>
                  )}

                  {item.description && (
                    <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      <ExternalLink size={13} />
                      View Reference Link
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Add Reference Book</h3>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-gray-900"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.subject_code} — {s.subject_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit (Optional)</label>
                    <select
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-gray-900"
                    >
                      <option value="">Entire Subject Resource</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unit_number}: {u.unit_title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Book Title"
                    placeholder="e.g., Operating System Concepts"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Author(s)"
                      placeholder="e.g., Silberschatz & Galvin"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                    />
                    <Input
                      label="Edition"
                      placeholder="e.g., 10th Ed."
                      value={edition}
                      onChange={(e) => setEdition(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Key chapters or syllabus topics covered..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900"
                    />
                  </div>

                  <Input
                    label="Resource URL / Download Link"
                    placeholder="https://..."
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" fullWidth onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" fullWidth disabled={submitting}>
                      {submitting ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                      Add Book
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
