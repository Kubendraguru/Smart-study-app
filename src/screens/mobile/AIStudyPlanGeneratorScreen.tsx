import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Sparkles,
  Clock,
  Calendar,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Save,
  RotateCcw,
  Zap,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { AIProposedPlan, TaskPriority } from '@/types';
import { generateAIStudyPlan, saveAIStudyPlan } from '@/service/aiPlanner';

export default function AIStudyPlanGeneratorScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  // Configuration options
  const [availableHours, setAvailableHours] = useState(3);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');
  const [difficultyPrefs, setDifficultyPrefs] = useState<Record<string, 'easy' | 'medium' | 'hard'>>({});
  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string; code: string }[]>([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [proposedPlan, setProposedPlan] = useState<AIProposedPlan | null>(null);
  const [isAIResponse, setIsAIResponse] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('subjects')
      .select('id, subject_name, subject_code')
      .order('subject_name')
      .then(({ data }) => {
        if (data) {
          setSubjectsList(
            data.map((s) => ({
              id: s.id,
              name: s.subject_name,
              code: s.subject_code,
            }))
          );
        }
      });
  }, []);

  const toggleDifficulty = (subjectId: string) => {
    setDifficultyPrefs((prev) => {
      const current = prev[subjectId] || 'medium';
      const next = current === 'medium' ? 'hard' : current === 'hard' ? 'easy' : 'medium';
      return { ...prev, [subjectId]: next };
    });
  };

  const handleGeneratePlan = async () => {
    if (!user) return;
    setGenerating(true);

    try {
      const res = await generateAIStudyPlan({
        studentId: user.id,
        availableHoursPerDay: availableHours,
        preferredStartTime: startTime,
        preferredEndTime: endTime,
        difficultyPreferences: difficultyPrefs,
        planDurationDays: 7,
      });

      if (res.success && res.plan) {
        setProposedPlan(res.plan);
        setIsAIResponse(res.isAI);
      } else {
        Alert.alert('Notice', res.error || 'Could not generate plan.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = async () => {
    if (!user || !proposedPlan) return;
    setSaving(true);

    try {
      const res = await saveAIStudyPlan(user.id, proposedPlan, {
        studentId: user.id,
        availableHoursPerDay: availableHours,
        preferredStartTime: startTime,
        preferredEndTime: endTime,
        difficultyPreferences: difficultyPrefs,
      });

      if (res.success) {
        Alert.alert(
          'Plan Saved Successfully! 🎉',
          `Created ${res.tasksCount || 0} scheduled study sessions with automated phone reminders.`,
          [
            {
              text: 'View in Planner',
              onPress: () => navigation.navigate('StudentTabs', { screen: 'StudyPlanner' }),
            },
          ]
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to save study plan');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save study plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader title="AI Study Plan Generator" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!proposedPlan ? (
          <>
            {/* Intro Banner */}
            <View style={styles.heroCard}>
              <View style={styles.heroIconBox}>
                <Sparkles size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>AI Exam & Study Timetable</Text>
              <Text style={styles.heroSub}>
                Gemini AI inspects your teacher-uploaded exams, curriculum units, and available hours to build a non-overlapping daily timetable.
              </Text>
            </View>

            {/* Config: Available Hours */}
            <Text style={styles.sectionTitle}>1. Available Study Time Per Day</Text>
            <View style={styles.hoursRow}>
              {[2, 3, 4, 5].map((hrs) => (
                <TouchableOpacity
                  key={hrs}
                  style={[styles.hourBtn, availableHours === hrs && styles.hourBtnActive]}
                  onPress={() => setAvailableHours(hrs)}
                  activeOpacity={0.7}
                >
                  <Clock size={16} color={availableHours === hrs ? '#FFFFFF' : theme.colors.primary} />
                  <Text style={[styles.hourText, availableHours === hrs && styles.hourTextActive]}>
                    {hrs} Hours
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Config: Preferred Window */}
            <Text style={styles.sectionTitle}>2. Preferred Daily Study Window</Text>
            <View style={styles.timeRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Start Time (HH:MM)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>End Time (HH:MM)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="21:00"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Config: Subject Priorities / Difficulty */}
            <Text style={styles.sectionTitle}>3. Subject Difficulty (Tap to Toggle)</Text>
            <Text style={styles.sectionSub}>
              Mark challenging subjects as "Hard" so AI allocates more revision time.
            </Text>

            <View style={styles.subjectsGrid}>
              {subjectsList.map((s) => {
                const diff = difficultyPrefs[s.id] || 'medium';
                const diffColor =
                  diff === 'hard'
                    ? theme.colors.danger
                    : diff === 'easy'
                    ? theme.colors.success
                    : theme.colors.warning;

                return (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.subjectItem}
                    onPress={() => toggleDifficulty(s.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectCodeText}>{s.code}</Text>
                      <Text style={styles.subjectNameText} numberOfLines={1}>
                        {s.name}
                      </Text>
                    </View>
                    <View style={[styles.diffBadge, { backgroundColor: diffColor + '20' }]}>
                      <Text style={[styles.diffBadgeText, { color: diffColor }]}>
                        {diff.toUpperCase()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleGeneratePlan}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.generateBtnText}>Analyzing Syllabus & Exams...</Text>
                </>
              ) : (
                <>
                  <Sparkles size={20} color="#FFFFFF" />
                  <Text style={styles.generateBtnText}>Generate My Study Plan</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Proposed Plan Review Header */}
            <View style={styles.planHeaderCard}>
              <View style={styles.planHeaderTop}>
                <View style={styles.planIconBox}>
                  <Sparkles size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{proposedPlan.title}</Text>
                  <Text style={styles.planSub}>{proposedPlan.description}</Text>
                </View>
              </View>

              <View style={styles.aiSummaryBox}>
                <Text style={styles.aiSummaryText}>{proposedPlan.summary}</Text>
              </View>

              <View style={styles.planActionRow}>
                <TouchableOpacity
                  style={styles.regenerateBtn}
                  onPress={handleGeneratePlan}
                  disabled={generating}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.regenerateBtnText}>Regenerate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.savePlanBtn}
                  onPress={handleSavePlan}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Save size={16} color="#FFFFFF" />
                      <Text style={styles.savePlanBtnText}>Save Study Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Day by Day Schedule Preview */}
            <Text style={styles.sectionTitle}>Proposed Daily Timetable</Text>

            {proposedPlan.daily_schedules.map((day, dIdx) => (
              <View key={dIdx} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Calendar size={16} color={theme.colors.primary} />
                  <Text style={styles.dayTitle}>
                    {day.day_name} ({day.date})
                  </Text>
                </View>

                {day.sessions.map((sess, sIdx) => {
                  const isRevision = sess.type === 'revision';
                  const priorityColor =
                    sess.priority === 'high'
                      ? theme.colors.danger
                      : sess.priority === 'low'
                      ? theme.colors.success
                      : theme.colors.warning;

                  return (
                    <View key={sIdx} style={styles.sessionItem}>
                      <View style={styles.sessionTimeBox}>
                        <Clock size={12} color={theme.colors.primary} />
                        <Text style={styles.sessionTimeText}>
                          {sess.start_time} - {sess.end_time}
                        </Text>
                      </View>

                      <View style={styles.sessionInfo}>
                        <View style={styles.sessionBadges}>
                          <View style={styles.sessSubjBadge}>
                            <Text style={styles.sessSubjText}>{sess.subject_name}</Text>
                          </View>
                          {isRevision && (
                            <View style={styles.sessTypeBadge}>
                              <Text style={styles.sessTypeText}>REVISION</Text>
                            </View>
                          )}
                          <View style={[styles.sessDiffBadge, { backgroundColor: priorityColor + '20' }]}>
                            <Text style={[styles.sessDiffText, { color: priorityColor }]}>
                              {sess.priority.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.sessionTitle}>{sess.title}</Text>
                        <Text style={styles.sessionDesc}>{sess.description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity
              style={[styles.savePlanBtn, { width: '100%', marginTop: 12, paddingVertical: 14 }]}
              onPress={handleSavePlan}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" />
                  <Text style={[styles.savePlanBtnText, { fontSize: 15 }]}>
                    Approve & Save to My Study Planner
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 12,
    color: theme.colors.primaryLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 10,
  },
  sectionSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 10,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  hourBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  hourBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  hourText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  hourTextActive: {
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  subjectsGrid: {
    gap: 8,
    marginBottom: 24,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  subjectCodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  subjectNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  planHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  planHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  planSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  aiSummaryBox: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  aiSummaryText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    lineHeight: 16,
  },
  planActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  regenerateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  savePlanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  savePlanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: 10,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sessionItem: {
    marginBottom: 10,
    paddingLeft: 4,
  },
  sessionTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sessionTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sessionInfo: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 10,
  },
  sessionBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sessSubjBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sessSubjText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sessTypeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sessTypeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  sessDiffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sessDiffText: {
    fontSize: 9,
    fontWeight: '800',
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sessionDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
