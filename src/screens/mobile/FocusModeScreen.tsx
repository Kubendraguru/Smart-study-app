import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  AppState,
  type AppStateStatus,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Hourglass,
  Play,
  Pause,
  StopCircle,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Calendar,
  History,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  FileText,
  Video as VideoIcon,
  Coffee,
  X,
  Clock,
  ShieldAlert,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
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
import type { Subject, FocusSession, ActiveFocusState } from '@/types';

type ScreenView = 'setup' | 'active' | 'completed' | 'history';

const PRESET_DURATIONS = [
  { label: '15 min', minutes: 15, tag: 'Quick Sprint' },
  { label: '25 min', minutes: 25, tag: 'Pomodoro' },
  { label: '45 min', minutes: 45, tag: 'Deep Work' },
  { label: '60 min', minutes: 60, tag: 'Intense Session' },
];

export default function FocusModeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Overall screen view
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

  // 1. Initial Load: Check for any existing active session & fetch subjects
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
      console.error('Error loading subjects for focus mode:', err);
    } finally {
      setLoadingSubjects(false);
    }
  }

  // Load units when subject changes in setup
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

  // Restore any persisted active session
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
      // Completed while app was closed
      handleSessionCompleted(saved);
    }
  }

  // 2. AppState Listener for Background / Stepped-Away Detection
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [activeState, isPaused, view]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (view !== 'active' || !activeState) return;

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // User is stepping away or minimizing app
      const updated = {
        ...activeState,
        leftAppTimestamp: Date.now(),
      };
      setActiveState(updated);
      await saveActiveSessionLocal(updated);
    } else if (nextAppState === 'active') {
      // User returned to the app
      const isIntentional = await getIntentionalNavigationFlag();
      if (isIntentional) {
        // Reset the flag and continue without showing reminder
        await setIntentionalNavigationFlag(false);
      } else if (!isPaused) {
        // Unintended exit: Show gentle reminder
        setShowSteppedAwayModal(true);
      }

      // Re-synchronize exact timer from timestamp
      if (!isPaused && activeState.targetEndTimestamp) {
        const remaining = Math.max(0, Math.floor((activeState.targetEndTimestamp - Date.now()) / 1000));
        setRemainingSeconds(remaining);
        if (remaining === 0) {
          handleSessionCompleted(activeState);
        }
      }
    }
  };

  // 3. Main Timer Loop (Timestamp-based)
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

  // Start Focus Session
  const handleStartSession = async () => {
    const minutes = isCustom ? parseInt(customMinutes, 10) || 25 : selectedMinutes;
    if (minutes <= 0 || minutes > 300) {
      Alert.alert('Invalid Duration', 'Please choose a duration between 1 and 300 minutes.');
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

  // Pause / Resume Session
  const handleTogglePause = async () => {
    if (!activeState) return;

    if (!isPaused) {
      // Pausing
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
      // Resuming
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

  // Session Completed (reached 0)
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

  // Manually End Session
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

  // Intentional study navigation helper
  const handleOpenStudyResource = async (screen: string, params: any) => {
    await setIntentionalNavigationFlag(true);
    navigation.navigate(screen, params);
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

  // Formatting helpers
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ========================================================= */}
      {/* 1. SETUP VIEW                                             */}
      {/* ========================================================= */}
      {view === 'setup' && (
        <>
          <AppHeader
            title="Focus Mode"
            showBack
            rightAction={
              <TouchableOpacity style={styles.headerIconBtn} onPress={loadHistory} activeOpacity={0.7}>
                <History size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            }
          />

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Supportive Alert if returned from Emergency Exit */}
            {supportiveMessage && (
              <View style={styles.supportiveAlert}>
                <CheckCircle2 size={18} color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.supportiveAlertText}>{supportiveMessage}</Text>
                <TouchableOpacity onPress={() => setSupportiveMessage(null)} style={{ padding: 4 }}>
                  <X size={14} color="#059669" />
                </TouchableOpacity>
              </View>
            )}

            {/* Intro Hero Banner */}
            <View style={styles.heroCard}>
              <View style={styles.heroBadge}>
                <Hourglass size={14} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>Study Mode</Text>
              </View>
              <Text style={styles.heroTitle}>Lock In Your Focus</Text>
              <Text style={styles.heroSub}>
                Select your focus interval, pick your subject, and eliminate distractions.
              </Text>
            </View>

            {/* Duration Selector */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionLabel}>CHOOSE DURATION</Text>
              <View style={styles.presetGrid}>
                {PRESET_DURATIONS.map((preset) => {
                  const isSelected = !isCustom && selectedMinutes === preset.minutes;
                  return (
                    <TouchableOpacity
                      key={preset.minutes}
                      style={[styles.presetCard, isSelected && styles.presetCardActive]}
                      onPress={() => {
                        setSelectedMinutes(preset.minutes);
                        setIsCustom(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetTime, isSelected && styles.presetTimeActive]}>
                        {preset.label}
                      </Text>
                      <Text style={[styles.presetTag, isSelected && styles.presetTagActive]}>
                        {preset.tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Duration Option */}
              <TouchableOpacity
                style={[styles.customRow, isCustom && styles.customRowActive]}
                onPress={() => setIsCustom(true)}
                activeOpacity={0.8}
              >
                <Clock size={16} color={isCustom ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.customText, isCustom && styles.customTextActive]}>Custom Duration:</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="Minutes"
                  value={customMinutes}
                  onChangeText={(val) => {
                    setCustomMinutes(val);
                    setIsCustom(true);
                  }}
                  keyboardType="number-pad"
                  placeholderTextColor={theme.colors.textMuted}
                />
                <Text style={styles.customUnit}>mins</Text>
              </TouchableOpacity>
            </View>

            {/* Optional Subject & Unit Selection */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionLabel}>STUDY TARGET (OPTIONAL)</Text>

              {/* Subject Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  <TouchableOpacity
                    style={[styles.chipItem, !selectedSubjectId && styles.chipItemActive]}
                    onPress={() => setSelectedSubjectId('')}
                  >
                    <Text style={[styles.chipText, !selectedSubjectId && styles.chipTextActive]}>Any Subject</Text>
                  </TouchableOpacity>
                  {subjects.map((s) => {
                    const isSel = selectedSubjectId === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.chipItem, isSel && styles.chipItemActive]}
                        onPress={() => setSelectedSubjectId(s.id)}
                      >
                        <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                          {s.subject_code} - {s.subject_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Unit Dropdown if subject selected */}
              {selectedSubjectId !== '' && units.length > 0 && (
                <View style={[styles.inputGroup, { marginTop: 10 }]}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    <TouchableOpacity
                      style={[styles.chipItem, !selectedUnitId && styles.chipItemActive]}
                      onPress={() => setSelectedUnitId('')}
                    >
                      <Text style={[styles.chipText, !selectedUnitId && styles.chipTextActive]}>Full Subject</Text>
                    </TouchableOpacity>
                    {units.map((u) => {
                      const isSel = selectedUnitId === u.id;
                      return (
                        <TouchableOpacity
                          key={u.id}
                          style={[styles.chipItem, isSel && styles.chipItemActive]}
                          onPress={() => setSelectedUnitId(u.id)}
                        >
                          <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                            Unit {u.unit_number}: {u.unit_title || u.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Emergency Exit Explanation Card */}
            <View style={styles.emergencyNoticeCard}>
              <ShieldAlert size={20} color="#D97706" style={{ marginTop: 2, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyNoticeTitle}>Emergency Exit Guarantee</Text>
                <Text style={styles.emergencyNoticeDesc}>
                  You can safely exit study mode at any time without penalty or negative ratings.
                </Text>
              </View>
            </View>

            {/* Start Button */}
            <TouchableOpacity style={styles.startBtn} onPress={handleStartSession} activeOpacity={0.85}>
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.startBtnText}>
                Start Focus Session ({isCustom ? (customMinutes || 25) : selectedMinutes} min)
              </Text>
            </TouchableOpacity>

            {/* History Link */}
            <TouchableOpacity style={styles.historyLinkBtn} onPress={loadHistory} activeOpacity={0.7}>
              <History size={16} color={theme.colors.primary} />
              <Text style={styles.historyLinkText}>View My Focus Session History</Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      )}

      {/* ========================================================= */}
      {/* 2. ACTIVE FOCUS SESSION VIEW                              */}
      {/* ========================================================= */}
      {view === 'active' && (
        <View style={styles.activeContainer}>
          {/* Top Status Header */}
          <View style={styles.activeTopHeader}>
            <View style={styles.activeBadge}>
              <View style={[styles.pulseDot, isPaused && { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.activeBadgeText}>{isPaused ? 'SESSION PAUSED' : 'FOCUS MODE ACTIVE'}</Text>
            </View>

            <TouchableOpacity style={styles.endEarlyBtn} onPress={() => setShowEndConfirmModal(true)}>
              <Text style={styles.endEarlyBtnText}>End Session</Text>
            </TouchableOpacity>
          </View>

          {/* Center Target Info */}
          <View style={styles.activeCenterContent}>
            {activeState?.subjectName && (
              <View style={styles.activeSubjectPill}>
                <BookOpen size={14} color={theme.colors.primary} />
                <Text style={styles.activeSubjectText} numberOfLines={1}>
                  {activeState.subjectName}
                </Text>
              </View>
            )}

            {activeState?.unitTitle && (
              <Text style={styles.activeUnitText} numberOfLines={1}>
                {activeState.unitTitle}
              </Text>
            )}

            {/* Big Countdown Timer */}
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{formatTimer(remainingSeconds)}</Text>
              <Text style={styles.timerSubText}>
                {isPaused ? 'Paused' : `${getProgressPercentage()}% completed`}
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.activeProgressBarBg}>
              <View style={[styles.activeProgressBarFill, { width: `${getProgressPercentage()}%` }]} />
            </View>

            {/* Controls Row */}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.pauseBtn, isPaused && styles.resumeBtn]}
                onPress={handleTogglePause}
                activeOpacity={0.8}
              >
                {isPaused ? (
                  <>
                    <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.pauseBtnText}>Resume Session</Text>
                  </>
                ) : (
                  <>
                    <Pause size={18} color={theme.colors.text} />
                    <Text style={[styles.pauseBtnText, { color: theme.colors.text }]}>Pause Session</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Study Resource Navigation if subject is set */}
            {activeState?.subjectId && (
              <View style={styles.resourceRow}>
                <TouchableOpacity
                  style={styles.resourceBtn}
                  onPress={() =>
                    handleOpenStudyResource('SubjectDetails', {
                      subjectId: activeState.subjectId,
                    })
                  }
                >
                  <FileText size={14} color={theme.colors.primary} />
                  <Text style={styles.resourceBtnText}>Course PDFs</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resourceBtn}
                  onPress={() =>
                    handleOpenStudyResource('YouTube', {
                      subjectId: activeState.subjectId,
                    })
                  }
                >
                  <VideoIcon size={14} color="#DC2626" />
                  <Text style={[styles.resourceBtnText, { color: '#DC2626' }]}>Video Lectures</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Bottom Emergency Exit Button */}
          <View style={styles.emergencyBottomBox}>
            <TouchableOpacity
              style={styles.emergencyBtn}
              onPress={() => setShowEmergencyModal(true)}
              activeOpacity={0.8}
            >
              <AlertTriangle size={16} color="#DC2626" />
              <Text style={styles.emergencyBtnText}>Emergency Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 3. SESSION COMPLETED CELEBRATION VIEW                     */}
      {/* ========================================================= */}
      {view === 'completed' && (
        <View style={styles.completedContainer}>
          <View style={styles.completedIconBox}>
            <Sparkles size={48} color="#059669" />
          </View>

          <Text style={styles.completedTitle}>🎉 Great Work!</Text>
          <Text style={styles.completedSubtitle}>You completed your focus session.</Text>

          {/* Stats Summary Card */}
          <View style={styles.completedCard}>
            <View style={styles.completedStatRow}>
              <Text style={styles.completedStatLabel}>Focus Duration:</Text>
              <Text style={styles.completedStatVal}>{activeState?.plannedMinutes ?? 25} Minutes</Text>
            </View>

            {activeState?.subjectName && (
              <View style={styles.completedStatRow}>
                <Text style={styles.completedStatLabel}>Subject Studied:</Text>
                <Text style={styles.completedStatVal}>{activeState.subjectName}</Text>
              </View>
            )}

            <View style={styles.completedStatRow}>
              <Text style={styles.completedStatLabel}>Session Status:</Text>
              <Text style={[styles.completedStatVal, { color: '#059669' }]}>Completed ✓</Text>
            </View>
          </View>

          <Text style={styles.encouragingText}>
            “You stayed with your study plan until the end. Keep building that habit!”
          </Text>

          {/* Action Buttons */}
          <View style={{ width: '100%', gap: 10, marginTop: 24 }}>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => {
                setActiveState(null);
                setView('setup');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.startBtnText}>Start Another Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historyLinkBtn}
              onPress={loadHistory}
              activeOpacity={0.7}
            >
              <Text style={styles.historyLinkText}>View Session History</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 4. SESSION HISTORY VIEW                                   */}
      {/* ========================================================= */}
      {view === 'history' && (
        <>
          <AppHeader title="Focus Session History" showBack onBack={() => setView('setup')} />

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {loadingHistory ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading session history...</Text>
              </View>
            ) : (
              <>
                {/* Stats Summary Header */}
                <View style={styles.historyStatsCard}>
                  <View style={styles.historyStatCol}>
                    <Text style={styles.historyStatVal}>{historyStats.totalCompletedSessions}</Text>
                    <Text style={styles.historyStatLabel}>Completed</Text>
                  </View>
                  <View style={styles.historyStatDivider} />
                  <View style={styles.historyStatCol}>
                    <Text style={styles.historyStatVal}>{historyStats.totalCompletedMinutes}m</Text>
                    <Text style={styles.historyStatLabel}>Focused Time</Text>
                  </View>
                  <View style={styles.historyStatDivider} />
                  <View style={styles.historyStatCol}>
                    <Text style={styles.historyStatVal}>{historyStats.totalElapsedMinutes}m</Text>
                    <Text style={styles.historyStatLabel}>Total Elapsed</Text>
                  </View>
                </View>

                <Text style={styles.historyListTitle}>Past Study Sessions</Text>

                {historySessions.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <History size={40} color={theme.colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Focus Sessions Yet</Text>
                    <Text style={styles.emptySub}>Start your first focus session to build your study habit!</Text>
                  </View>
                ) : (
                  historySessions.map((session) => {
                    const elapsedMins = Math.round((session.actual_duration_seconds || 0) / 60);
                    const isDone = session.status === 'completed';
                    const isEmerg = session.status === 'emergency_ended';

                    return (
                      <View key={session.id} style={styles.historyItemCard}>
                        <View style={styles.historyItemTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyItemDate}>
                              {new Date(session.started_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                            <Text style={styles.historyItemSubject}>
                              {session.subject ? `${session.subject.subject_code} - ${session.subject.subject_name}` : 'General Study'}
                            </Text>
                            {session.unit && (
                              <Text style={styles.historyItemUnit}>
                                Unit {session.unit.unit_number}: {session.unit.title}
                              </Text>
                            )}
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              isDone && styles.statusBadgeCompleted,
                              isEmerg && styles.statusBadgeEmergency,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isDone && styles.statusBadgeTextCompleted,
                                isEmerg && styles.statusBadgeTextEmergency,
                              ]}
                            >
                              {isDone ? 'Completed ✓' : isEmerg ? 'Emergency Exit' : 'Ended Early'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.historyItemFooter}>
                          <Text style={styles.historyDurationText}>
                            Planned: {session.planned_duration_minutes}m • Elapsed: {elapsedMins}m
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL: STEPPED AWAY GENTLE REMINDER                       */}
      {/* ========================================================= */}
      <Modal visible={showSteppedAwayModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.reminderIconBox}>
              <Coffee size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Welcome Back! 📚</Text>
            <Text style={styles.modalBody}>
              Hey! You stepped away from your study session. Ready to continue?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setShowSteppedAwayModal(false);
                  handleTogglePause(); // Pause session so they can take a break
                }}
              >
                <Text style={styles.modalSecondaryBtnText}>I Needed a Break</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setShowSteppedAwayModal(false)}
              >
                <Text style={styles.modalPrimaryBtnText}>Continue Studying</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: EMERGENCY EXIT CONFIRMATION                        */}
      {/* ========================================================= */}
      <Modal visible={showEmergencyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.reminderIconBox, { backgroundColor: '#FEE2E2' }]}>
              <AlertTriangle size={32} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Need to leave for an emergency?</Text>
            <Text style={styles.modalBody}>
              Your current study progress will be safely saved without any penalty.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setShowEmergencyModal(false)}
              >
                <Text style={styles.modalSecondaryBtnText}>Continue Studying</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleConfirmEmergencyExit}
              >
                <Text style={styles.modalPrimaryBtnText}>Yes, Exit Focus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: MANUALLY END SESSION CONFIRMATION                  */}
      {/* ========================================================= */}
      <Modal visible={showEndConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.reminderIconBox, { backgroundColor: '#FEF3C7' }]}>
              <StopCircle size={32} color="#D97706" />
            </View>
            <Text style={styles.modalTitle}>End Focus Session?</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to wrap up this study session early?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setShowEndConfirmModal(false)}
              >
                <Text style={styles.modalSecondaryBtnText}>Keep Studying</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { backgroundColor: '#475569' }]}
                onPress={handleConfirmManualEnd}
              >
                <Text style={styles.modalPrimaryBtnText}>End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerIconBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  supportiveAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  supportiveAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    color: '#DBEAFE',
    lineHeight: 18,
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  presetCardActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  presetTime: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  presetTimeActive: {
    color: theme.colors.primary,
  },
  presetTag: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  presetTagActive: {
    color: theme.colors.primary,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  customRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  customText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  customTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  customInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlign: 'center',
  },
  customUnit: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  inputGroup: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  chipItem: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipItemActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  emergencyNoticeCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emergencyNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  emergencyNoticeDesc: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  historyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  historyLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  activeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    justifyContent: 'space-between',
  },
  activeTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  endEarlyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  endEarlyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  activeCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  activeSubjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
  },
  activeSubjectText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  activeUnitText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  timerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F8FAFC',
    borderWidth: 6,
    borderColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  timerText: {
    fontSize: 44,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: 1,
  },
  timerSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  activeProgressBarBg: {
    width: '80%',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  activeProgressBarFill: {
    height: '100%',
    backgroundColor: '#1E40AF',
    borderRadius: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  resumeBtn: {
    backgroundColor: '#1E40AF',
  },
  pauseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resourceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  resourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  resourceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emergencyBottomBox: {
    alignItems: 'center',
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  emergencyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  completedContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  completedIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 4,
  },
  completedSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  completedCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 10,
  },
  completedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedStatLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  completedStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  encouragingText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  historyStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#1E40AF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  historyStatCol: {
    alignItems: 'center',
  },
  historyStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  historyStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DBEAFE',
    marginTop: 2,
  },
  historyStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  historyListTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 10,
  },
  historyItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  historyItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyItemDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyItemSubject: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  historyItemUnit: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeEmergency: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  statusBadgeTextCompleted: {
    color: '#059669',
  },
  statusBadgeTextEmergency: {
    color: '#D97706',
  },
  historyItemFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  historyDurationText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  reminderIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
