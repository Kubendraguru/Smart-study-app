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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  AlertCircle,
  Layers,
  GraduationCap,
  Filter,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import {
  getStudentArrearSubjects,
  getEligibleArrearSubjects,
  addArrearSubjects,
  removeArrearSubject,
  ArrearSubjectItem,
} from '@/service/arrears';
import { getProfile } from '@/service/auth';

export default function ArrearSubjectsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [currentSemester, setCurrentSemester] = useState(5);
  const [selectedArrears, setSelectedArrears] = useState<ArrearSubjectItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<ArrearSubjectItem[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [activeSemesterFilter, setActiveSemesterFilter] = useState<number | 'all'>('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get profile semester
      const profile = await getProfile(user.id);
      const studentSem = profile?.semester || 5;
      setCurrentSemester(studentSem);

      // 2. Fetch student's active arrears & eligible previous subjects
      const [arrears, eligible] = await Promise.all([
        getStudentArrearSubjects(user.id),
        getEligibleArrearSubjects({ maxSemester: studentSem }),
      ]);

      setSelectedArrears(arrears);
      setAvailableSubjects(eligible);
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
              setSelectedArrears((prev) => prev.filter((s) => s.id !== subject.id));
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

  // Filter available subjects: exclude already selected arrears
  const unselectedAvailable = availableSubjects.filter(
    (s) => !selectedArrears.some((a) => a.id === s.id)
  );

  const filteredAvailable = unselectedAvailable.filter((s) => {
    if (activeSemesterFilter === 'all') return true;
    return s.semester === activeSemesterFilter;
  });

  // Calculate available semester tabs from previous semesters (1..currentSemester-1)
  const previousSemesters = Array.from({ length: Math.max(0, currentSemester - 1) }, (_, i) => i + 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="My Arrear Subjects" showBack />

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
              Select and access all study notes, videos, playlists, assignments, and books from previous semesters.
            </Text>
          </View>
        </View>

        {successMessage ? (
          <View style={styles.successBanner}>
            <Check size={16} color="#059669" />
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* Section 1: Active Arrear Subjects */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Selected Arrear Subjects</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{selectedArrears.length}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color={theme.colors.danger} />
            <Text style={styles.loadingText}>Loading arrear subjects...</Text>
          </View>
        ) : selectedArrears.length === 0 ? (
          <View style={styles.emptyBox}>
            <AlertCircle size={28} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Arrear Subjects Selected</Text>
            <Text style={styles.emptySub}>
              Browse and add subjects from previous semesters below to access their curriculum materials.
            </Text>
          </View>
        ) : (
          selectedArrears.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.arrearCard}
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

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveArrear(item)}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={theme.colors.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
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
                    <Text style={styles.availableSem}>Semester {s.semester}</Text>
                  </View>
                  <Text style={styles.availableTitle}>{s.subject_name}</Text>
                  <Text style={styles.availableCredits}>{s.credits} Credits · {s.department}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Floating Add Selected Button */}
        {selectedToAdd.length > 0 && (
          <TouchableOpacity
            style={[styles.floatingAddBtn, saving && { opacity: 0.7 }]}
            onPress={handleAddSelected}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.floatingAddContent}>
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.floatingAddText}>
                  Add {selectedToAdd.length} Selected Arrear Subject{selectedToAdd.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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
    paddingBottom: 48,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#B91C1C',
    lineHeight: 15,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  countBadge: {
    backgroundColor: theme.colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  sectionSubCount: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  centerLoading: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  arrearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  arrearIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  arrearInfo: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  arrearCodeBadge: {
    backgroundColor: theme.colors.dangerBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  arrearCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  semBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  semBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  arrearTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 18,
  },
  arrearMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  availableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  availableCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkCircleSelected: {
    backgroundColor: theme.colors.primary,
  },
  availableInfo: {
    flex: 1,
  },
  availableCode: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  availableSem: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  availableTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  availableCredits: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  floatingAddBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  floatingAddContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingAddText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
