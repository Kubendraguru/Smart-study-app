import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Video,
  HelpCircle,
  ClipboardList,
} from 'lucide-react';

import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import PdfCard from '@/components/cards/PdfCard';
import VideoCard from '@/components/cards/VideoCard';
import Badge from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';

type Tab = 'pdfs' | 'videos' | 'questions' | 'assignments';

type Unit = {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description: string | null;
  completed: boolean;
  pdfs: any[];
  videos: any[];
  importantQuestions: any[];
  assignments: any[];
};

export default function UnitDetailsScreen() {
  const { subjectId, unitId } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('pdfs');
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnit();
  }, [unitId, subjectId]);

  async function loadUnit() {
    if (!unitId || !subjectId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .eq('subject_id', subjectId)
        .single();

      if (error) {
        console.error('Error loading unit:', error);
        setUnit(null);
        return;
      }

      if (!data) {
        setUnit(null);
        return;
      }

      setUnit({
        id: data.id,
        subject_id: data.subject_id,
        unit_number: data.unit_number,
        title: data.title,
        description: data.description ?? '',
        completed: data.completed ?? false,

        // These will be connected to Supabase later
        pdfs: [],
        videos: [],
        importantQuestions: [],
        assignments: [],
      });
    } catch (error) {
      console.error('Unexpected error loading unit:', error);
      setUnit(null);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------
  // Loading
  // ----------------------------------------

  if (loading) {
    return (
      <>
        <AppHeader title="Unit" showBack />

        <PageContainer showBottomNav>
          <div className="pt-20 text-center">
            <p className="text-sm text-gray-500">
              Loading unit...
            </p>
          </div>
        </PageContainer>

        <BottomNav />
      </>
    );
  }

  // ----------------------------------------
  // Unit not found
  // ----------------------------------------

  if (!unit) {
    return (
      <>
        <AppHeader title="Unit" showBack />

        <PageContainer showBottomNav>
          <div className="pt-20 text-center">
            <p className="text-sm text-gray-500">
              Unit not found.
            </p>

            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-sm font-semibold text-blue-600"
            >
              Go Back
            </button>
          </div>
        </PageContainer>

        <BottomNav />
      </>
    );
  }

  // ----------------------------------------
  // Tabs
  // ----------------------------------------

  const tabs: {
    id: Tab;
    label: string;
    icon: typeof FileText;
    count: number;
  }[] = [
    {
      id: 'pdfs',
      label: 'PDFs',
      icon: FileText,
      count: unit.pdfs.length,
    },
    {
      id: 'videos',
      label: 'Videos',
      icon: Video,
      count: unit.videos.length,
    },
    {
      id: 'questions',
      label: 'Questions',
      icon: HelpCircle,
      count: unit.importantQuestions.length,
    },
    {
      id: 'assignments',
      label: 'Assignments',
      icon: ClipboardList,
      count: unit.assignments.length,
    },
  ];

  return (
    <>
      <AppHeader
        title={`Unit ${unit.unit_number}`}
        showBack
      />

      <PageContainer showBottomNav>
        <div className="pt-4">

          {/* Unit information */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-200/60 border border-gray-100 mb-5"
          >
            <div className="flex items-center gap-2 mb-2">

              <Badge color="blue">
                Unit {unit.unit_number}
              </Badge>

              {unit.completed && (
                <Badge color="green">
                  Completed
                </Badge>
              )}

            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {unit.title}
            </h2>

            <p className="text-sm text-gray-500 leading-relaxed">
              {unit.description}
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">

            {tabs.map((t) => {
              const TabIcon = t.icon;
              const isActive = tab === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  <TabIcon size={15} />

                  {t.label}

                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20'
                        : 'bg-gray-200'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}

          </div>

          {/* Content */}
          <motion.div
            key={tab}
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >

            {/* PDFs */}
            {tab === 'pdfs' && (
              <div className="space-y-3">

                {unit.pdfs.length === 0 ? (
                  <EmptyState message="No PDFs available yet." />
                ) : (
                  unit.pdfs.map((pdf, i) => (
                    <PdfCard
                      key={pdf.id}
                      pdf={pdf}
                      index={i}
                      onClick={() =>
                        navigate(`/pdf/${pdf.id}`)
                      }
                    />
                  ))
                )}

              </div>
            )}

            {/* Videos */}
            {tab === 'videos' && (
              <div className="grid grid-cols-2 gap-3">

                {unit.videos.length === 0 ? (
                  <div className="col-span-2">
                    <EmptyState message="No videos available yet." />
                  </div>
                ) : (
                  unit.videos.map((video, i) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      index={i}
                      onClick={() =>
                        navigate(`/youtube/${video.id}`)
                      }
                    />
                  ))
                )}

              </div>
            )}

            {/* Questions */}
            {tab === 'questions' && (
              <div className="space-y-3">

                {unit.importantQuestions.length === 0 ? (
                  <EmptyState message="No important questions available yet." />
                ) : (
                  unit.importantQuestions.map(
                    (q, i) => (
                      <motion.div
                        key={q.id ?? i}
                        initial={{
                          opacity: 0,
                          x: -20,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay: i * 0.05,
                        }}
                        className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100"
                      >
                        <div className="flex items-start gap-3">

                          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-amber-600">
                              Q{i + 1}
                            </span>
                          </div>

                          <p className="text-sm text-gray-700 leading-relaxed">
                            {q.question ?? q}
                          </p>

                        </div>
                      </motion.div>
                    )
                  )
                )}

              </div>
            )}

            {/* Assignments */}
            {tab === 'assignments' && (
              <div className="space-y-3">

                {unit.assignments.length === 0 ? (
                  <EmptyState message="No assignments available yet." />
                ) : (
                  unit.assignments.map(
                    (a, i) => (
                      <motion.div
                        key={a.id ?? i}
                        initial={{
                          opacity: 0,
                          x: -20,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay: i * 0.05,
                        }}
                        className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100"
                      >
                        <div className="flex items-start gap-3">

                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <ClipboardList
                              size={16}
                              className="text-emerald-600"
                            />
                          </div>

                          <div className="flex-1">

                            <p className="text-sm text-gray-700 leading-relaxed mb-2">
                              {a.title ?? a}
                            </p>

                            <Badge color="green">
                              Pending
                            </Badge>

                          </div>

                        </div>
                      </motion.div>
                    )
                  )
                )}

              </div>
            )}

          </motion.div>
        </div>
      </PageContainer>

      <BottomNav />
    </>
  );
}


// ----------------------------------------
// Empty state
// ----------------------------------------

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="text-center py-10">

      <p className="text-sm font-medium text-gray-700">
        {message}
      </p>

      <p className="text-xs text-gray-500 mt-1">
        Learning materials added by teachers will appear here.
      </p>

    </div>
  );
}