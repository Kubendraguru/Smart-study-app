import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, Check, Video, ListVideo, Loader2 } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { getSubjects } from '@/service/subject';
import { addVideo } from '@/service/videos';
import { supabase } from '@/lib/supabase';

export default function AddYoutubeScreen() {
  const [mode, setMode] = useState<'video' | 'playlist'>('video');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');
  const [duration, setDuration] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [unitsList, setUnitsList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(false);

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
    if (!url.trim() || !title.trim() || !subjectId || !unitId) return;

    setSubmitting(true);
    try {
      await addVideo({
        title,
        url,
        subjectId,
        unitId,
        channel: channel.trim() || (mode === 'playlist' ? 'Curated Playlist' : 'Curated Lecture'),
        duration: duration.trim() || (mode === 'playlist' ? 'Full Playlist' : '15:00'),
        isPlaylist: mode === 'playlist',
      });

      setAdded(true);
      setUrl('');
      setTitle('');
      setChannel('');
      setDuration('');
      setTimeout(() => setAdded(false), 2500);
    } catch (err: any) {
      console.error('Error adding video:', err);
      alert(err.message || 'Failed to add video link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title={mode === 'playlist' ? 'Add YouTube Playlist' : 'Add YouTube Video'} showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button
              type="button"
              onClick={() => setMode('video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'video'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Video size={16} />
              Single Video
            </button>
            <button
              type="button"
              onClick={() => setMode('playlist')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'playlist'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListVideo size={16} />
              Full Playlist
            </button>
          </div>

          {added ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <Check size={40} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {mode === 'playlist' ? 'Playlist Added!' : 'Video Link Added!'}
              </h2>
              <p className="text-sm text-gray-500">
                Students can now stream this {mode === 'playlist' ? 'course playlist' : 'lecture'} under the selected unit.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  {mode === 'playlist' ? (
                    <ListVideo size={22} className="text-red-600" />
                  ) : (
                    <Video size={22} className="text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {mode === 'playlist' ? 'Curate YouTube Playlist' : 'Curate YouTube Video'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {mode === 'playlist'
                      ? 'Paste a playlist link (https://www.youtube.com/playlist?list=...)'
                      : 'Paste any YouTube lesson URL to attach to a unit'}
                  </p>
                </div>
              </motion.div>

              <Input
                label={mode === 'playlist' ? 'Playlist URL' : 'YouTube URL'}
                placeholder={
                  mode === 'playlist'
                    ? 'https://www.youtube.com/playlist?list=PL...'
                    : 'https://www.youtube.com/watch?v=...'
                }
                icon={<Link2 size={18} />}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />

              <Input
                label={mode === 'playlist' ? 'Playlist Title' : 'Video Title'}
                placeholder={
                  mode === 'playlist'
                    ? 'e.g., Computer Networks Full Course'
                    : 'e.g., TCP vs UDP in 10 Minutes'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Channel Name"
                  placeholder="e.g., Gate Smashers"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
                <Input
                  label={mode === 'playlist' ? 'Videos Note' : 'Duration'}
                  placeholder={mode === 'playlist' ? 'e.g., 24 Videos' : 'e.g., 15:00'}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

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
                      {s.subject_code ? `${s.subject_code} — ` : ''}{s.subject_name || s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select a unit</option>
                  {unitsList.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number}: {u.unit_title || `Unit ${u.unit_number}`}
                    </option>
                  ))}
                </select>
              </div>

              <Button fullWidth size="lg" type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 size={18} className="animate-spin mr-2" />
                ) : null}
                {mode === 'playlist' ? 'Attach Playlist' : 'Add Video Link'}
              </Button>
            </form>
          )}
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}
