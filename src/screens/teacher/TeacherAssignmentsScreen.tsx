import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Plus,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  X,
  Check,
  Loader2,
  Edit3,
  Link2,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '@/service/assignments';
import { getSubjects } from '@/service/subject';
import { supabase } from '@/lib/supabase';
import type { Assignment } from '@/types';

export default function TeacherAssignmentsScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [maxMarks, setMaxMarks] = useState('100');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [assigns, subjs] = await Promise.all([
        getAssignments(),
        getSubjects(),
      ]);
      setAssignments(assigns);
      setSubjects(subjs);
      if (subjs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subjs[0].id);
      }
    } catch (err) {
      console.error('Error loading assignments:', err);
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
        if (!editingId) {
          if (data && data.length > 0) {
            setSelectedUnitId(data[0].id);
          } else {
            setSelectedUnitId('');
          }
        }
      } catch (err) {
        console.error('Error loading units:', err);
      }
    }
    loadUnits();
  }, [selectedSubjectId, editingId]);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDueDate('');
    setDueTime('23:59');
    setMaxMarks('100');
    setAttachmentUrl('');
    if (subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
    setShowModal(true);
  };

  const openEditModal = (item: Assignment) => {
    setEditingId(item.id);
    setSelectedSubjectId(item.subject_id);
    setSelectedUnitId(item.unit_id || '');
    setTitle(item.title);
    setDescription(item.description || '');
    setDueDate(item.due_date);
    setDueTime(item.due_time || '23:59');
    setMaxMarks(String(item.max_marks || 100));
    setAttachmentUrl(item.attachment_url || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSubjectId || !dueDate.trim()) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await updateAssignment(editingId, {
          title: title.trim(),
          description: description.trim(),
          dueDate: dueDate.trim(),
          dueTime: dueTime.trim() || '23:59',
          maxMarks: Number(maxMarks) || 100,
          attachmentUrl: attachmentUrl.trim() || undefined,
          unitId: selectedUnitId || null,
        });
      } else {
        await createAssignment({
          subjectId: selectedSubjectId,
          unitId: selectedUnitId || null,
          title: title.trim(),
          description: description.trim(),
          dueDate: dueDate.trim(),
          dueTime: dueTime.trim() || '23:59',
          maxMarks: Number(maxMarks) || 100,
          attachmentUrl: attachmentUrl.trim() || undefined,
        });
      }

      setShowModal(false);
      setEditingId(null);
      setTitle('');
      setDescription('');
      setDueDate('');
      setAttachmentUrl('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, assignTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${assignTitle}"?`)) return;
    try {
      await deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete assignment.');
    }
  };

  return (
    <>
      <AppHeader title="Manage Assignments" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Assignments ({assignments.length})</h2>
            <Button size="sm" onClick={openCreateModal}>
              <Plus size={16} className="mr-1" />
              New Assignment
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
              Loading assignments...
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6">
              <ClipboardList size={40} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">No Assignments Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                Create and publish assignments, lab exercises, or project submissions for your students.
              </p>
              <Button size="sm" onClick={openCreateModal}>
                <Plus size={16} className="mr-1" />
                Create First Assignment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color="blue">{item.subject?.subject_code || 'Subject'}</Badge>
                      {item.unit && (
                        <Badge color="amber">Unit {item.unit.unit_number}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-gray-400 hover:text-blue-600 p-1 rounded-lg transition-colors"
                        title="Edit Assignment"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                        title="Delete Assignment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {item.attachment_url && (
                    <div className="mb-2">
                      <a
                        href={item.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Link2 size={12} />
                        View Attached File
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-50 pt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <Calendar size={13} />
                        Due: {item.due_date}
                      </span>
                      {item.due_time && (
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {item.due_time}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-emerald-600">{item.max_marks} Marks</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create / Edit Modal */}
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
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingId ? 'Edit Assignment' : 'Create Assignment'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
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
                      <option value="">General Subject Assignment</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unit_number}: {u.unit_title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Assignment Title"
                    placeholder="e.g., Assignment 2: Binary Search Trees"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Instructions, problem statement, or submission guidelines..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Due Date (YYYY-MM-DD)"
                      placeholder="2026-10-20"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                    <Input
                      label="Max Marks"
                      placeholder="100"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(e.target.value)}
                    />
                  </div>

                  <Input
                    label="Attachment Link (Optional)"
                    placeholder="https://... (PDF, Drive, or Problem Sheet URL)"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" fullWidth onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" fullWidth disabled={submitting}>
                      {submitting ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                      {editingId ? 'Save Changes' : 'Publish'}
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

