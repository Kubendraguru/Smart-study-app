import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Calendar,
  Clock,
  BookOpen,
  Link2,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import Badge from '@/components/ui/Badge';
import { getStudentAssignments } from '@/service/assignments';
import { useAuth } from '@/context/AuthContext';
import type { Assignment } from '@/types';

export default function StudentAssignmentsScreen() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const data = await getStudentAssignments(user.id);
        setAssignments(data);
      } catch (err) {
        console.error('Error loading assignments:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Distinct subjects for filtering
  const subjectsMap = new Map<string, string>();
  assignments.forEach((a) => {
    if (a.subject?.id && a.subject?.subject_code) {
      subjectsMap.set(a.subject.id, a.subject.subject_code);
    }
  });
  const subjectFilters = Array.from(subjectsMap.entries()).map(([id, code]) => ({
    id,
    code,
  }));

  const filteredAssignments = assignments.filter((a) => {
    if (selectedSubjectFilter === 'all') return true;
    return a.subject_id === selectedSubjectFilter;
  });

  return (
    <>
      <AppHeader title="My Assignments" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4 pb-12">
          {/* Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Course Assignments</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Review homework, lab tasks, and problem sets published by your faculty members.
              </p>
            </div>
          </motion.div>

          {/* Subject Filter Tabs */}
          {subjectFilters.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedSubjectFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({assignments.length})
              </button>
              {subjectFilters.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(s.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedSubjectFilter === s.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.code}
                </button>
              ))}
            </div>
          )}

          {/* Assignments List */}
          {loading ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
              Loading assignments...
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6">
              <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">No Assignments Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {assignments.length === 0
                  ? 'Your instructors have not published any assignments yet.'
                  : 'No assignments match the selected subject filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color="blue">{a.subject?.subject_code || 'Subject'}</Badge>
                      {a.unit && (
                        <Badge color="amber">Unit {a.unit.unit_number}</Badge>
                      )}
                    </div>
                    <span className="font-bold text-emerald-600 text-sm">
                      {a.max_marks} Marks
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base mb-1">{a.title}</h3>

                  {a.description && (
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {a.description}
                    </p>
                  )}

                  {a.attachment_url && (
                    <div className="mb-3">
                      <a
                        href={a.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <Link2 size={13} />
                        View Attached Problem Sheet / Reference
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-50 pt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-amber-700 font-semibold">
                        <Calendar size={13} />
                        Due: {a.due_date}
                      </span>
                      {a.due_time && (
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {a.due_time}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
