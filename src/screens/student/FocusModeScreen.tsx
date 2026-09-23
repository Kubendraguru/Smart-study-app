import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Hourglass,
  Play,
  Pause,
  StopCircle,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  History,
  Sparkles,
  ArrowLeft,
  FileText,
  Video as VideoIcon,
  Coffee,
  X,
  Clock,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import Badge from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import {
  saveActiveSessionLocal,
  getActiveSessionLocal,
  clearActiveSessionLocal,
  setIntentionalNavigationFlag,
  getIntentionalNavigationFlag,
  startFocusSession,
  updateFocusSessionStatus,
  getStudentFocusHistory,
} from '@/service/focus';
import type { FocusSession, ActiveFocusState } from '@/types';

type ScreenView = 'setup' | 'active' | 'completed' | 'history';

const PRESET_DURATIONS = [
  { label: '15 min', minutes: 15, tag: 'Quick Sprint' },
  { label: '25 min', minutes: 25, tag: 'Pomodoro' },
  { label: '45 min', minutes: 45, tag: 'Deep Work' },
  { label: '60 min', minutes: 60, tag: 'Intense Study' },
];

export default function FocusModeScreen() {
  const navigate = useNavigate();

  const [view, setView] = useState<ScreenView>('setup');

  // Setup state
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Active Session State
  const [activeState, setActiveState] = useState<ActiveFocusState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [isPaused, setIsPaused] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  // Modals
  const [showSteppedAwayModal, setShowSteppedAwayModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [supportiveMessage, setSupportiveMessage] = useState<string | null>(null);

  // History State
  const [historySessions, setHistorySessions] = useState<FocusSession[]>([]);
  const [historyStats, setHistoryStats] = useState({
    totalCompletedMinutes: 0,
    totalCompletedSessions: 0,
    totalElapsedMinutes: 0,
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 1. Initial Load: Check for active session & fetch subjects
  useEffect(() => {
    loadSubjects();
    restoreActiveSession();
  }, []);

  async function loadSubjects() {
    setLoadingSubjects(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('semester')
        .eq('id', authData.user.id)
        .single();

      const studentSem = profile?.semester || 5;

      const { data: subjs } = await supabase
        .from('subjects')
        .select('id, subject_code, subject_name, semester')
        .eq('semester', studentSem)
        .order('subject_name', { ascending: true });

      setSubjects(subjs || []);
    } catch (err) {
      console.error('Error loading subjects:', err);
    } finally {
      setLoadingSubjects(false);
    }
  }

  // Load units when subject is selected
  useEffect(() => {
    if (!selectedSubjectId) {
      setUnits([]);
      setSelectedUnitId('');
      return;
    }

    async function loadUnits() {
      const { data } = await supabase
        .from('units')
        .select('id, unit_number, title, unit_title')
        .eq('subject_id', selectedSubjectId)
        .order('unit_number', { ascending: true });

      setUnits(data || []);
      setSelectedUnitId('');
    }
    loadUnits();
  }, [selectedSubjectId]);

  // Restore persisted session from storage
  async function restoreActiveSession() {
    const saved = await getActiveSessionLocal();
    if (!saved) return;

    const now = Date.now();
    if (saved.isPaused) {
      setActiveState(saved);
      setIsPaused(true);
      setRemainingSeconds(saved.pausedRemainingSeconds);
      setView('active');
    } else if (saved.targetEndTimestamp > now) {
      const remaining = Math.max(0, Math.floor((saved.targetEndTimestamp - now) / 1000));
      setActiveState(saved);
      setIsPaused(false);
      setRemainingSeconds(remaining);
      setView('active');
    } else {
      handleSessionCompleted(saved);
    }
  }

  // 2. Web Visibility & Focus Listener
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (view !== 'active' || !activeState) return;

      if (document.hidden) {
        // Tab hidden or minimized
        const updated = {
          ...activeState,
          leftAppTimestamp: Date.now(),
        };
        setActiveState(updated);
        await saveActiveSessionLocal(updated);
      } else {
        // Returned to tab
        const isIntentional = await getIntentionalNavigationFlag();
        if (isIntentional) {
          await setIntentionalNavigationFlag(false);
        } else if (!isPaused) {
          setShowSteppedAwayModal(true);
        }

        // Re-calculate remaining timer from timestamp
        if (!isPaused && activeState.targetEndTimestamp) {
          const remaining = Math.max(0, Math.floor((activeState.targetEndTimestamp - Date.now()) / 1000));
          setRemainingSeconds(remaining);
          if (remaining === 0) {
            handleSessionCompleted(activeState);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [view, activeState, isPaused]);

  // 3. Timer Interval Loop
  useEffect(() => {
    if (view !== 'active' || isPaused || !activeState) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((activeState.targetEndTimestamp - now) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        handleSessionCompleted(activeState);
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [view, isPaused, activeState]);

  // Start Session
  const handleStartSession = async () => {
    const minutes = isCustom ? parseInt(customMinutes, 10) || 25 : selectedMinutes;
    if (minutes <= 0 || minutes > 300) {
      alert('Please select a focus duration between 1 and 300 minutes.');
      return;
    }

    const selectedSubj = subjects.find((s) => s.id === selectedSubjectId);
    const selectedU = units.find((u) => u.id === selectedUnitId);

    const res = await startFocusSession({
      plannedMinutes: minutes,
      subjectId: selectedSubjectId || undefined,
      unitId: selectedUnitId || undefined,
    });

    const now = Date.now();
    const durationSeconds = minutes * 60;
    const targetEnd = now + durationSeconds * 1000;

    const newState: ActiveFocusState = {
      sessionId: res.session?.id,
      plannedMinutes: minutes,
      subjectId: selectedSubjectId,
      subjectName: selectedSubj ? `${selectedSubj.subject_code} - ${selectedSubj.subject_name}` : undefined,
      unitId: selectedUnitId,
      unitTitle: selectedU ? (selectedU.unit_title || selectedU.title || `Unit ${selectedU.unit_number}`) : undefined,
      startTimestamp: now,
      targetEndTimestamp: targetEnd,
      isPaused: false,
      pausedRemainingSeconds: durationSeconds,
      isIntentionalNavigation: false,
    };

    setActiveState(newState);
    setRemainingSeconds(durationSeconds);
    setIsPaused(false);
    await saveActiveSessionLocal(newState);
    setView('active');
  };

  // Toggle Pause
  const handleTogglePause = async () => {
    if (!activeState) return;

    if (!isPaused) {
      const pausedRemaining = remainingSeconds;
      const updated: ActiveFocusState = {
        ...activeState,
        isPaused: true,
        pausedRemainingSeconds: pausedRemaining,
      };
      setIsPaused(true);
      setActiveState(updated);
      await saveActiveSessionLocal(updated);
    } else {
      const now = Date.now();
      const newTargetEnd = now + remainingSeconds * 1000;
      const updated: ActiveFocusState = {
        ...activeState,
        isPaused: false,
        targetEndTimestamp: newTargetEnd,
        pausedRemainingSeconds: remainingSeconds,
      };
      setIsPaused(false);
      setActiveState(updated);
      await saveActiveSessionLocal(updated);
    }
  };

  // Session Completed
  const handleSessionCompleted = async (sessionState: ActiveFocusState) => {
    const elapsedSecs = sessionState.plannedMinutes * 60;
    if (sessionState.sessionId) {
      await updateFocusSessionStatus(sessionState.sessionId, 'completed', elapsedSecs);
    }
    await clearActiveSessionLocal();
    setView('completed');
  };

  // Emergency Exit
  const handleConfirmEmergencyExit = async () => {
    if (!activeState) return;

    const elapsedSeconds = Math.max(
      0,
      activeState.plannedMinutes * 60 - remainingSeconds
    );

    if (activeState.sessionId) {
      await updateFocusSessionStatus(activeState.sessionId, 'emergency_ended', elapsedSeconds);
    }

    await clearActiveSessionLocal();
    setShowEmergencyModal(false);
    setActiveState(null);
    setSupportiveMessage('Take care. Your study progress is saved. You can continue later.');
    setView('setup');
  };

  // Manually End
  const handleConfirmManualEnd = async () => {
    if (!activeState) return;

    const elapsedSeconds = Math.max(
      0,
      activeState.plannedMinutes * 60 - remainingSeconds
    );

    if (activeState.sessionId) {
      await updateFocusSessionStatus(activeState.sessionId, 'manually_ended', elapsedSeconds);
    }

    await clearActiveSessionLocal();
    setShowEndConfirmModal(false);
    setActiveState(null);
    setView('setup');
  };

  // Intentional study resource navigation
  const handleOpenStudyResource = async (path: string) => {
    await setIntentionalNavigationFlag(true);
    navigate(path);
  };

  // Load History
  const loadHistory = async () => {
    setLoadingHistory(true);
    setView('history');
    const result = await getStudentFocusHistory();
    setHistorySessions(result.sessions);
    setHistoryStats({
      totalCompletedMinutes: result.totalCompletedMinutes,
      totalCompletedSessions: result.totalCompletedSessions,
      totalElapsedMinutes: result.totalElapsedMinutes,
    });
    setLoadingHistory(false);
  };

  // Format timer
  const formatTimer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!activeState || activeState.plannedMinutes <= 0) return 0;
    const totalSecs = activeState.plannedMinutes * 60;
    const elapsed = totalSecs - remainingSeconds;
    return Math.min(100, Math.max(0, Math.round((elapsed / totalSecs) * 100)));
  };

  return (
    <>
      <AppHeader
        title="Focus Mode"
        showBack
        rightAction={
          view === 'setup' ? (
            <button
              onClick={loadHistory}
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-blue-600 transition-colors"
              title="Session History"
            >
              <History size={18} />
            </button>
          ) : undefined
        }
      />

      <PageContainer showBottomNav>
        <div className="pt-4 max-w-xl mx-auto space-y-5">
          {/* ========================================================= */}
          {/* 1. SETUP VIEW                                             */}
          {/* ========================================================= */}
          {view === 'setup' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Supportive message if returned from emergency */}
              {supportiveMessage && (
                <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>{supportiveMessage}</span>
                  </div>
                  <button onClick={() => setSupportiveMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Hero Banner */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20">
                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-xl text-xs font-bold mb-3 backdrop-blur-sm">
                  <Hourglass size={14} />
                  <span>Study Mode</span>
                </div>
                <h1 className="text-xl font-black mb-1">Lock In Your Focus</h1>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Select your focus interval, pick your subject, and stay in the zone.
                </p>
              </div>

              {/* Duration Presets */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Select Duration
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_DURATIONS.map((preset) => {
                    const isSelected = !isCustom && selectedMinutes === preset.minutes;
                    return (
                      <button
                        key={preset.minutes}
                        onClick={() => {
                          setSelectedMinutes(preset.minutes);
                          setIsCustom(false);
                        }}
                        className={`p-3.5 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-base font-black">{preset.label}</p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{preset.tag}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Minutes Input */}
                <div
                  onClick={() => setIsCustom(true)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    isCustom ? 'bg-blue-50/50 border-blue-600' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Clock size={16} className={isCustom ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="text-xs font-bold text-gray-700">Custom Duration:</span>
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => {
                      setCustomMinutes(e.target.value);
                      setIsCustom(true);
                    }}
                    placeholder="e.g. 35"
                    className="w-20 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400 font-semibold">minutes</span>
                </div>
              </div>

              {/* Target Subject / Unit */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Study Target (Optional)
                </label>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Subject / General Study</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_code} - {s.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSubjectId !== '' && units.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit</label>
                    <select
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Full Subject</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unit_number}: {u.unit_title || u.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Emergency Notice Card */}
              <div className="flex items-start gap-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4">
                <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Emergency Exit Guarantee</h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
                    You can exit focus mode at any moment without shame, penalties, or negative rankings.
                  </p>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartSession}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Play size={16} fill="white" />
                <span>Start Focus Session ({isCustom ? (customMinutes || 25) : selectedMinutes} min)</span>
              </button>

              {/* View History Button */}
              <button
                onClick={loadHistory}
                className="w-full py-3 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5"
              >
                <History size={14} />
                <span>View My Focus Session History</span>
              </button>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 2. ACTIVE FOCUS VIEW                                      */}
          {/* ========================================================= */}
          {view === 'active' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-6"
            >
              {/* Header pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-[11px] font-bold text-gray-700">
                  <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                  <span>{isPaused ? 'SESSION PAUSED' : 'STUDY MODE ACTIVE'}</span>
                </div>

                <button
                  onClick={() => setShowEndConfirmModal(true)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-700"
                >
                  End Early
                </button>
              </div>

              {/* Subject Tag */}
              {activeState?.subjectName && (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-1">
                    <BookOpen size={13} />
                    <span>{activeState.subjectName}</span>
                  </div>
                  {activeState?.unitTitle && (
                    <p className="text-xs text-gray-500 font-medium">{activeState.unitTitle}</p>
                  )}
                </div>
              )}

              {/* Big Timer Display */}
              <div className="py-6">
                <div className="w-56 h-56 rounded-full border-8 border-blue-600 bg-gray-50 mx-auto flex flex-col items-center justify-center shadow-inner">
                  <span className="text-5xl font-black text-gray-900 tracking-tight">
                    {formatTimer(remainingSeconds)}
                  </span>
                  <span className="text-xs font-semibold text-gray-400 mt-2">
                    {isPaused ? 'Paused' : `${getProgressPercentage()}% completed`}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleTogglePause}
                  className={`px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isPaused
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {isPaused ? (
                    <>
                      <Play size={15} fill="white" />
                      <span>Resume Session</span>
                    </>
                  ) : (
                    <>
                      <Pause size={15} />
                      <span>Pause Session</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Study Resource Links (sets intentional flag) */}
              {activeState?.subjectId && (
                <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleOpenStudyResource(`/subject/${activeState.subjectId}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-blue-600 border border-gray-200"
                  >
                    <FileText size={13} />
                    <span>Open Unit PDFs</span>
                  </button>

                  <button
                    onClick={() => handleOpenStudyResource(`/subjects`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-rose-600 border border-gray-200"
                  >
                    <VideoIcon size={13} />
                    <span>Watch Videos</span>
                  </button>
                </div>
              )}

              {/* Emergency Exit Button */}
              <div className="pt-4">
                <button
                  onClick={() => setShowEmergencyModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors"
                >
                  <AlertTriangle size={14} />
                  <span>Emergency Exit</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 3. SESSION COMPLETED CELEBRATION                          */}
          {/* ========================================================= */}
          {view === 'completed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-5"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <Sparkles size={40} />
              </div>

              <h2 className="text-2xl font-black text-gray-900">🎉 Great Work!</h2>
              <p className="text-sm text-gray-500">You completed your focus session.</p>

              <div className="bg-gray-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Duration:</span>
                  <span className="font-bold text-gray-900">{activeState?.plannedMinutes ?? 25} Minutes</span>
                </div>
                {activeState?.subjectName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Subject:</span>
                    <span className="font-bold text-gray-900 truncate ml-2">{activeState.subjectName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Status:</span>
                  <span className="font-bold text-emerald-600">Completed ✓</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 italic px-4">
                “You stayed with your study plan until the end. Keep building that habit!”
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    setActiveState(null);
                    setView('setup');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all"
                >
                  Start Another Session
                </button>

                <button
                  onClick={loadHistory}
                  className="w-full py-2.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  View Session History
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 4. SESSION HISTORY VIEW                                   */}
          {/* ========================================================= */}
          {view === 'history' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setView('setup')}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Focus Setup</span>
                </button>
              </div>

              {/* Stats Summary Card */}
              <div className="grid grid-cols-3 gap-2.5 bg-gradient-to-br from-blue-600 to-indigo-800 p-5 rounded-2xl text-white shadow-lg shadow-blue-600/20 text-center">
                <div>
                  <p className="text-xl font-black">{historyStats.totalCompletedSessions}</p>
                  <p className="text-[10px] text-blue-100 font-semibold">Completed</p>
                </div>
                <div className="border-x border-white/20">
                  <p className="text-xl font-black">{historyStats.totalCompletedMinutes}m</p>
                  <p className="text-[10px] text-blue-100 font-semibold">Focused Time</p>
                </div>
                <div>
                  <p className="text-xl font-black">{historyStats.totalElapsedMinutes}m</p>
                  <p className="text-[10px] text-blue-100 font-semibold">Total Elapsed</p>
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-900">Past Focus Sessions</h3>

              {loadingHistory ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Loading history...</p>
                </div>
              ) : historySessions.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <History size={36} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-800">No focus sessions recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historySessions.map((session) => {
                    const elapsedMins = Math.round((session.actual_duration_seconds || 0) / 60);
                    const isDone = session.status === 'completed';
                    const isEmerg = session.status === 'emergency_ended';

                    return (
                      <div
                        key={session.id}
                        className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between gap-3"
                      >
                        <div>
                          <p className="text-[11px] text-gray-400 font-medium">
                            {new Date(session.started_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <h4 className="text-xs font-bold text-gray-900 mt-0.5">
                            {session.subject
                              ? `${session.subject.subject_code} - ${session.subject.subject_name}`
                              : 'General Study'}
                          </h4>
                          {session.unit && (
                            <p className="text-[11px] text-gray-500">Unit {session.unit.unit_number}: {session.unit.title}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1 font-medium">
                            Planned: {session.planned_duration_minutes}m • Elapsed: {elapsedMins}m
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700'
                              : isEmerg
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isDone ? 'Completed ✓' : isEmerg ? 'Emergency Exit' : 'Ended Early'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </PageContainer>

      {/* ========================================================= */}
      {/* MODAL: STEPPED AWAY GENTLE REMINDER                       */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showSteppedAwayModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Coffee size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Welcome Back! 📚</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Hey! You stepped away from your study session. Ready to continue?
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowSteppedAwayModal(false);
                    handleTogglePause();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700"
                >
                  I Needed a Break
                </button>
                <button
                  onClick={() => setShowSteppedAwayModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Continue Studying
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: EMERGENCY EXIT                                     */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showEmergencyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Need to leave for an emergency?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your current study progress will be safely saved without any penalty.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700"
                >
                  Continue Studying
                </button>
                <button
                  onClick={handleConfirmEmergencyExit}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Yes, Exit Focus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: END EARLY                                          */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showEndConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <StopCircle size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900">End Focus Session?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to wrap up this study session early?
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowEndConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700"
                >
                  Keep Studying
                </button>
                <button
                  onClick={handleConfirmManualEnd}
                  className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  End Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </>
  );
}
