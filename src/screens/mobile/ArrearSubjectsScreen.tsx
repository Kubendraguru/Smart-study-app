import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  Modal,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  AlertCircle,
  GraduationCap,
  Trophy,
  Sparkles,
  Settings,
  RotateCcw,
  CheckCircle,
  X,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import {
  getStudentArrearSubjects,
  getEligibleArrearSubjects,
  addArrearSubjects,
  removeArrearSubject,
  markArrearPassed,
  markArrearActive,
  ArrearSubjectItem,
} from '@/service/arrears';
import {
  getArrearMotivationSettings,
  saveArrearMotivationSettings,
} from '@/service/arrearMotivation';
import { getProfile } from '@/service/auth';
import ArrearPassCelebrationModal from '@/components/mobile/ArrearPassCelebrationModal';
import type { ArrearMotivationLanguage, ArrearMotivationSettings } from '@/types';

export default function ArrearSubjectsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [currentSemester, setCurrentSemester] = useState(5);
  const [arrearList, setArrearList] = useState<ArrearSubjectItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<ArrearSubjectItem[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [activeSemesterFilter, setActiveSemesterFilter] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'passed'>('active');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Celebration state
  const [celebrationSubject, setCelebrationSubject] = useState<{ name: string; code: string } | null>(null);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [motivationSettings, setMotivationSettings] = useState<ArrearMotivationSettings>({
    enabled: true,
    language: 'both',
    min_interval_minutes: 5,
    max_interval_minutes: 12,
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get profile semester
      const profile = await getProfile(user.id);
      const studentSem = profile?.semester || 5;
      setCurrentSemester(studentSem);

      // 2. Fetch student's arrears & eligible subjects & settings
      const [arrears, eligible, settings] = await Promise.all([
        getStudentArrearSubjects(user.id, 'all'),
        getEligibleArrearSubjects({ maxSemester: studentSem }),
        getArrearMotivationSettings(),
      ]);

      setArrearList(arrears);
      setAvailableSubjects(eligible);
      setMotivationSettings(settings);
      setSelectedToAdd([]);
    } catch (err) {
      console.error('Error loading arrear subjects data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const activeArrears = arrearList.filter((s) => s.status !== 'passed');
  const passedArrears = arrearList.filter((s) => s.status === 'passed');

  const toggleSelectToAdd = (subjectId: string) => {
    setSelectedToAdd((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleAddSelected = async () => {
    if (selectedToAdd.length === 0) return;

    setSaving(true);
    setSuccessMessage('');
    try {
      await addArrearSubjects(selectedToAdd, user?.id);
      setSuccessMessage(`${selectedToAdd.length} arrear subject(s) added successfully!`);
      setSelectedToAdd([]);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add arrear subjects.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveArrear = (subject: ArrearSubjectItem) => {
    Alert.alert(
      'Remove Arrear Subject',
      `Are you sure you want to remove "${subject.subject_code}: ${subject.subject_name}" from your arrear subjects list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeArrearSubject(subject.id, user?.id);
              setArrearList((prev) => prev.filter((s) => s.id !== subject.id));
              setSuccessMessage(`Removed "${subject.subject_code}" from your arrears.`);
              setTimeout(() => setSuccessMessage(''), 2500);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove arrear subject.');
            }
          },
        },
      ]
    );
  };

  const handleMarkPassed = async (subject: ArrearSubjectItem) => {
    try {
      const res = await markArrearPassed(subject.id, user?.id);
      if (res.success) {
        setArrearList((prev) =>
          prev.map((s) => (s.id === subject.id ? { ...s, status: 'passed', passed_at: new Date().toISOString() } : s))
        );
        setCelebrationSubject({ name: subject.subject_name, code: subject.subject_code });
      } else {
        Alert.alert('Error', res.error || 'Failed to update arrear status.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark as passed.');
    }
  };

  const handleMarkActive = async (subject: ArrearSubjectItem) => {
    try {
      const res = await markArrearActive(subject.id, user?.id);
      if (res.success) {
        setArrearList((prev) =>
          prev.map((s) => (s.id === subject.id ? { ...s, status: 'active', passed_at: null } : s))
        );
        setSuccessMessage(`Reactivated "${subject.subject_code}" as an active arrear.`);
        setTimeout(() => setSuccessMessage(''), 2500);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status.');
    }
  };

  const handleSaveSettings = async (newSettings: Partial<ArrearMotivationSettings>) => {
    const updated = await saveArrearMotivationSettings(newSettings);
    setMotivationSettings(updated);
  };

  // Filter available subjects: exclude already registered arrears
  const unselectedAvailable = availableSubjects.filter(
    (s) => !arrearList.some((a) => a.id === s.id)
  );

  const filteredAvailable = unselectedAvailable.filter((s) => {
    if (activeSemesterFilter === 'all') return true;
    return s.semester === activeSemesterFilter;
  });

  const previousSemesters = Array.from({ length: Math.max(0, currentSemester - 1) }, (_, i) => i + 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="My Arrear Subjects"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.settingsHeaderBtn}
            onPress={() => setShowSettingsModal(true)}
            activeOpacity={0.7}
          >
            <Sparkles size={18} color="#D97706" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.danger]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <GraduationCap size={24} color={theme.colors.danger} />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Clear Backlog Courses</Text>
            <Text style={styles.bannerSubtitle}>
              Access lecture notes, units, videos, and celebrate your passed exams.
            </Text>
          </View>
        </View>

        {successMessage ? (
          <View style={styles.successBanner}>
            <Check size={16} color="#059669" />
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* Tab Selector: Active vs Passed */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'active' && styles.tabBtnTextActive]}>
              Active Backlogs
            </Text>
            <View style={[styles.tabBadge, activeTab === 'active' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'active' && styles.tabBadgeTextActive]}>
                {activeArrears.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'passed' && styles.tabBtnActive]}
            onPress={() => setActiveTab('passed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'passed' && styles.tabBtnTextActive]}>
              Cleared & Passed
            </Text>
            <View style={[styles.tabBadge, activeTab === 'passed' && styles.tabBadgePassedActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'passed' && styles.tabBadgePassedTextActive]}>
                {passedArrears.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 1: Active Backlogs */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color={theme.colors.danger} />
            <Text style={styles.loadingText}>Loading arrear subjects...</Text>
          </View>
        ) : activeTab === 'active' ? (
          activeArrears.length === 0 ? (
            <View style={styles.emptyBox}>
              <AlertCircle size={28} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Active Arrear Subjects</Text>
              <Text style={styles.emptySub}>
                Browse and add subjects from previous semesters below to access their curriculum materials.
              </Text>
            </View>
          ) : (
            activeArrears.map((item) => (
              <View key={item.id} style={styles.arrearCard}>
                <TouchableOpacity
                  style={styles.cardClickArea}
                  onPress={() =>
                    navigation.navigate('SubjectDetails', {
                      subjectId: item.id,
                      subjectName: item.subject_name,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.arrearIconBox}>
                    <BookOpen size={20} color={theme.colors.danger} />
                  </View>

                  <View style={styles.arrearInfo}>
                    <View style={styles.badgeRow}>
                      <View style={styles.arrearCodeBadge}>
                        <Text style={styles.arrearCodeText}>{item.subject_code}</Text>
                      </View>
                      <View style={styles.semBadge}>
                        <Text style={styles.semBadgeText}>Sem {item.semester}</Text>
                      </View>
                    </View>
                    <Text style={styles.arrearTitle} numberOfLines={2}>
                      {item.subject_name}
                    </Text>
                    <Text style={styles.arrearMeta}>
                      {item.credits} Credits · {item.department}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Card Action Row */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.passBtn}
                    onPress={() => handleMarkPassed(item)}
                    activeOpacity={0.8}
                  >
                    <Trophy size={14} color="#059669" />
                    <Text style={styles.passBtnText}>Mark as Passed</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() =>
                      navigation.navigate('SubjectDetails', {
                        subjectId: item.id,
                        subjectName: item.subject_name,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.openBtnText}>Open Course</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveArrear(item)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          // Cleared / Passed Arrears List
          passedArrears.length === 0 ? (
            <View style={styles.emptyBox}>
              <Trophy size={32} color="#F59E0B" />
              <Text style={styles.emptyTitle}>No Cleared Arrears Yet</Text>
              <Text style={styles.emptySub}>
                When you pass an arrear exam, tap &quot;Mark as Passed&quot; to celebrate and record your achievement!
              </Text>
            </View>
          ) : (
            passedArrears.map((item) => (
              <View key={item.id} style={styles.passedCard}>
                <View style={styles.cardClickArea}>
                  <View style={styles.passedIconBox}>
                    <CheckCircle size={22} color="#059669" />
                  </View>

                  <View style={styles.arrearInfo}>
                    <View style={styles.badgeRow}>
                      <View style={styles.passedCodeBadge}>
                        <Text style={styles.passedCodeText}>{item.subject_code}</Text>
                      </View>
                      <View style={styles.passedBadge}>
                        <Text style={styles.passedBadgeText}>PASSED</Text>
                      </View>
                    </View>
                    <Text style={styles.arrearTitle} numberOfLines={2}>
                      {item.subject_name}
                    </Text>
                    <Text style={styles.arrearMeta}>
                      Sem {item.semester} · {item.department}
                      {item.passed_at ? ` · Cleared on ${new Date(item.passed_at).toLocaleDateString()}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Passed Action Row */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.celebrateBtn}
                    onPress={() =>
                      setCelebrationSubject({ name: item.subject_name, code: item.subject_code })
                    }
                    activeOpacity={0.8}
                  >
                    <Sparkles size={13} color="#B45309" />
                    <Text style={styles.celebrateBtnText}>View Celebration</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.undoBtn}
                    onPress={() => handleMarkActive(item)}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={14} color="#64748B" />
                    <Text style={styles.undoBtnText}>Undo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveArrear(item)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}

        {/* Section 2: Browse Previous Semesters */}
        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <Text style={styles.sectionTitle}>Browse Previous Semesters</Text>
          <Text style={styles.sectionSubCount}>
            {unselectedAvailable.length} available
          </Text>
        </View>

        {/* Semester Filter Tabs */}
        {previousSemesters.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, activeSemesterFilter === 'all' && styles.filterChipActive]}
              onPress={() => setActiveSemesterFilter('all')}
            >
              <Text style={[styles.filterChipText, activeSemesterFilter === 'all' && styles.filterChipTextActive]}>
                All Previous Semesters
              </Text>
            </TouchableOpacity>
            {previousSemesters.map((sem) => (
              <TouchableOpacity
                key={sem}
                style={[styles.filterChip, activeSemesterFilter === sem && styles.filterChipActive]}
                onPress={() => setActiveSemesterFilter(sem)}
              >
                <Text style={[styles.filterChipText, activeSemesterFilter === sem && styles.filterChipTextActive]}>
                  Semester {sem}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Eligible Subjects List */}
        {loading ? null : filteredAvailable.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No Subjects Available</Text>
            <Text style={styles.emptySub}>
              {unselectedAvailable.length === 0
                ? 'All eligible previous semester subjects have already been added.'
                : 'No subjects found for the selected semester.'}
            </Text>
          </View>
        ) : (
          filteredAvailable.map((s) => {
            const isSelected = selectedToAdd.includes(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.availableCard, isSelected && styles.availableCardSelected]}
                onPress={() => toggleSelectToAdd(s.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                  {isSelected ? <Check size={14} color="#FFFFFF" /> : <Plus size={14} color={theme.colors.textMuted} />}
                </View>

                <View style={styles.availableInfo}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.availableCode}>{s.subject_code}</Text>
                    <View style={styles.semBadgeSmall}>
                      <Text style={styles.semBadgeSmallText}>Sem {s.semester}</Text>
                    </View>
                  </View>
                  <Text style={styles.availableTitle} numberOfLines={1}>
                    {s.subject_name}
                  </Text>
                  <Text style={styles.availableMeta}>
                    {s.credits} Credits · {s.department}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Add Selected Button */}
        {selectedToAdd.length > 0 && (
          <View style={styles.floatingAction}>
            <TouchableOpacity
              style={[styles.addBtn, saving && styles.addBtnDisabled]}
              onPress={handleAddSelected}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.addBtnText}>
                    Add {selectedToAdd.length} Arrear Subject{selectedToAdd.length > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Pass Celebration Modal */}
      <ArrearPassCelebrationModal
        visible={!!celebrationSubject}
        subjectName={celebrationSubject?.name}
        subjectCode={celebrationSubject?.code}
        onClose={() => setCelebrationSubject(null)}
      />

      {/* Motivation Settings Sheet */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Sparkles size={20} color="#D97706" />
                <Text style={styles.modalTitle}>Motivation Settings</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Receive gentle, encouraging messages at spaced intervals while you prepare for arrear exams.
            </Text>

            {/* Toggle Switch */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Motivational Pop-ups</Text>
                <Text style={styles.settingSub}>Show encouragement while studying arrears</Text>
              </View>
              <Switch
                value={motivationSettings.enabled}
                onValueChange={(val) => handleSaveSettings({ enabled: val })}
                trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                thumbColor={motivationSettings.enabled ? '#2563EB' : '#F1F5F9'}
              />
            </View>

            {/* Language Selection */}
            <Text style={styles.settingSectionTitle}>Preferred Language</Text>
            <View style={styles.langBtnRow}>
              {(['both', 'english', 'tanglish'] as ArrearMotivationLanguage[]).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.langChip,
                    motivationSettings.language === lang && styles.langChipActive,
                  ]}
                  onPress={() => handleSaveSettings({ language: lang })}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      motivationSettings.language === lang && styles.langChipTextActive,
                    ]}
                  >
                    {lang === 'both' ? 'Both' : lang === 'tanglish' ? 'Tanglish' : 'English'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hint Box */}
            <View style={styles.infoHintBox}>
              <Text style={styles.infoHintText}>
                💡 Messages appear randomly every 5-12 mins during arrear study and automatically pause when you leave the app.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setShowSettingsModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 90,
  },
  settingsHeaderBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  bannerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 3,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0F172A',
  },
  tabBadge: {
    backgroundColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: '#FEE2E2',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  tabBadgeTextActive: {
    color: '#991B1B',
  },
  tabBadgePassedActive: {
    backgroundColor: '#DCFCE7',
  },
  tabBadgePassedTextActive: {
    color: '#166534',
  },
  centerLoading: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  arrearCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  passedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardClickArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrearIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passedIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrearInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  arrearCodeBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  arrearCodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  passedCodeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  passedCodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  passedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  passedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },
  semBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  semBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  arrearTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  arrearMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  passBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  passBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  openBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  openBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  celebrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  celebrateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  undoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  removeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionSubCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  availableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  availableCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#2563EB',
  },
  availableInfo: {
    flex: 1,
  },
  availableCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  semBadgeSmall: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  semBadgeSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  availableTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  availableMeta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  floatingAction: {
    marginTop: 16,
  },
  addBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  settingSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  langBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  langChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  langChipTextActive: {
    color: '#2563EB',
  },
  infoHintBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoHintText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15,
  },
  modalDoneBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
