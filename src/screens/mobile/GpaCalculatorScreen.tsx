import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  GraduationCap,
  Calculator,
  Settings,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  TrendingUp,
  Award,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronDown,
  Download,
  Info,
  X,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import {
  PRESET_GRADING_SCHEMES,
  DEFAULT_GPA_SETTINGS,
  getActiveGradeDefinitions,
  lookupGradePoint,
  calculateSemesterSummary,
  getStudentAcademicSummary,
  saveSemesterResults,
  deleteSemesterResults,
  importCurriculumSubjects,
  saveStudentGpaSettings,
} from '@/service/gpa';
import type {
  StudentGpaSettings,
  AcademicCourse,
  OverallAcademicSummary,
  RepeatAttemptPolicy,
} from '@/types';

export default function GpaCalculatorScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [academicSummary, setAcademicSummary] = useState<OverallAcademicSummary | null>(null);
  const [selectedSemNum, setSelectedSemNum] = useState<number>(1);
  const [activeCourses, setActiveCourses] = useState<AcademicCourse[]>([]);
  const [academicYear, setAcademicYear] = useState<string>('');

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<StudentGpaSettings>(DEFAULT_GPA_SETTINGS);

  // Grade Picker Modal
  const [gradePickerIdx, setGradePickerIdx] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const summary = await getStudentAcademicSummary(user.id);
      setAcademicSummary(summary);
      setTempSettings(summary.settings);

      if (summary.semesters.length > 0) {
        const lastSem = summary.semesters[summary.semesters.length - 1];
        setSelectedSemNum(lastSem.semesterNumber);
        setActiveCourses(JSON.parse(JSON.stringify(lastSem.courses)));
        setAcademicYear(lastSem.academicYear || '');
      } else {
        setSelectedSemNum(1);
        setActiveCourses([]);
      }
    } catch (err) {
      console.error('Failed to load academic records:', err);
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

  const handleSelectSemester = (semNum: number) => {
    setSelectedSemNum(semNum);
    const existing = academicSummary?.semesters.find((s) => s.semesterNumber === semNum);
    if (existing) {
      setActiveCourses(JSON.parse(JSON.stringify(existing.courses)));
      setAcademicYear(existing.academicYear || '');
    } else {
      setActiveCourses([]);
      setAcademicYear('');
    }
  };

  const activeGrades = useMemo(() => {
    const settings = academicSummary?.settings || DEFAULT_GPA_SETTINGS;
    return getActiveGradeDefinitions(settings);
  }, [academicSummary?.settings]);

  const currentSemesterCalculation = useMemo(() => {
    const settings = academicSummary?.settings || DEFAULT_GPA_SETTINGS;
    return calculateSemesterSummary(selectedSemNum, activeCourses, settings, undefined, academicYear);
  }, [selectedSemNum, activeCourses, academicSummary?.settings, academicYear]);

  const availableSemesterNumbers = useMemo(() => {
    const defaultList = [1, 2, 3, 4, 5, 6, 7, 8];
    const savedNums = (academicSummary?.semesters || []).map((s) => s.semesterNumber);
    return Array.from(new Set([...defaultList, ...savedNums])).sort((a, b) => a - b);
  }, [academicSummary?.semesters]);

  const handleAddSubject = () => {
    const newCourse: AcademicCourse = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      studentId: user?.id || '',
      semesterNumber: selectedSemNum,
      subjectCode: '',
      subjectName: '',
      credits: 3.0,
      grade: activeGrades[0]?.grade || 'O',
      gradePoint: activeGrades[0]?.points || 10,
      isArrear: false,
      isCleared: true,
      isExcluded: false,
      attemptNumber: 1,
    };
    setActiveCourses((prev) => [...prev, newCourse]);
  };

  const handleRemoveSubject = (index: number) => {
    setActiveCourses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCourseChange = (index: number, field: keyof AcademicCourse, value: any) => {
    setActiveCourses((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'grade') {
        const settings = academicSummary?.settings || DEFAULT_GPA_SETTINGS;
        const { points, isPass, isCounted } = lookupGradePoint(value, settings);
        item.gradePoint = points;
        item.isCleared = isPass || points >= settings.passingMinPoints;
        item.isExcluded = !isCounted;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleImportCurriculum = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const imported = await importCurriculumSubjects(selectedSemNum, user.id);
      if (imported.length === 0) {
        Alert.alert('Notice', `No registered subjects found for Semester ${selectedSemNum}.`);
      } else {
        if (activeCourses.length === 0) {
          setActiveCourses(imported);
        } else {
          const existingCodes = new Set(activeCourses.map((c) => (c.subjectCode || '').trim().toUpperCase()).filter(Boolean));
          const existingNames = new Set(activeCourses.map((c) => c.subjectName.trim().toLowerCase()));
          const filteredImport = imported.filter(
            (c) =>
              !(c.subjectCode && existingCodes.has(c.subjectCode.trim().toUpperCase())) &&
              !existingNames.has(c.subjectName.trim().toLowerCase())
          );
          setActiveCourses((prev) => [...prev, ...filteredImport]);
        }
        Alert.alert('Success', `Imported ${imported.length} subjects for Semester ${selectedSemNum}.`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to import curriculum subjects.');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveSemester = async () => {
    if (!user) return;
    if (activeCourses.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one subject before saving.');
      return;
    }

    for (let i = 0; i < activeCourses.length; i++) {
      const c = activeCourses[i];
      if (!c.subjectName.trim()) {
        Alert.alert('Validation Error', `Subject #${i + 1} requires a subject name.`);
        return;
      }
      if (!c.credits || c.credits <= 0) {
        Alert.alert('Validation Error', `Subject "${c.subjectName}" must have credits > 0.`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await saveSemesterResults(selectedSemNum, activeCourses, user.id, academicYear);
      if (res.success) {
        Alert.alert('Success', `Semester ${selectedSemNum} results saved successfully!`);
        const updated = await getStudentAcademicSummary(user.id);
        setAcademicSummary(updated);
      } else {
        Alert.alert('Error', res.error || 'Failed to save results.');
      }
    } catch {
      Alert.alert('Error', 'Failed to save semester results.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSemester = () => {
    Alert.alert(
      'Delete Semester Records',
      `Are you sure you want to delete all saved subjects and grades for Semester ${selectedSemNum}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setSaving(true);
            try {
              await deleteSemesterResults(selectedSemNum, user.id);
              setActiveCourses([]);
              const updated = await getStudentAcademicSummary(user.id);
              setAcademicSummary(updated);
              Alert.alert('Deleted', `Semester ${selectedSemNum} records removed.`);
            } catch {
              Alert.alert('Error', 'Failed to delete semester records.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      await saveStudentGpaSettings(tempSettings, user.id);
      setIsSettingsOpen(false);
      const updated = await getStudentAcademicSummary(user.id);
      setAcademicSummary(updated);
      Alert.alert('Settings Updated', 'Grading scheme and repeat rules saved.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  const getGpaColor = (val: number, max: number = 10) => {
    const ratio = max > 0 ? val / max : 0;
    if (ratio >= 0.85) return '#059669';
    if (ratio >= 0.70) return theme.colors.primary;
    if (ratio >= 0.55) return '#D97706';
    return '#DC2626';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="GPA & CGPA Calculator" />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Calculating academic records...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        >
          {/* 1. Hero Summary Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.schemeTag}>
                <Text style={styles.schemeTagText} numberOfLines={1}>
                  {academicSummary?.settings.gradingSchemeName || 'Anna Univ 10-Point'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => setIsSettingsOpen(true)}
                activeOpacity={0.8}
              >
                <Settings size={15} color="#FFFFFF" />
                <Text style={styles.settingsBtnText}>Settings</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.heroLabel}>Cumulative Grade Point Average</Text>
            <View style={styles.cgpaRow}>
              <Text style={styles.cgpaValue}>
                {academicSummary && academicSummary.totalSemesters > 0
                  ? academicSummary.overallCgpa.toFixed(2)
                  : '0.00'}
              </Text>
              <Text style={styles.cgpaMax}>
                / {academicSummary?.settings.maxGradePoint.toFixed(1) || '10.0'} CGPA
              </Text>
            </View>

            {/* 3 Stats Grid */}
            <View style={styles.heroStatsGrid}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>
                  {academicSummary && academicSummary.semesters.length > 0
                    ? academicSummary.currentSemesterGpa.toFixed(2)
                    : '0.00'}
                </Text>
                <Text style={styles.heroStatLabel}>Current GPA</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>{academicSummary?.totalSemesters ?? 0}</Text>
                <Text style={styles.heroStatLabel}>Semesters</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>{academicSummary?.totalCreditsEarned ?? 0}</Text>
                <Text style={styles.heroStatLabel}>Credits Earned</Text>
              </View>
            </View>
          </View>

          {/* 2. Academic Progress Trend Chart */}
          {academicSummary && academicSummary.history.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBox}>
                  <TrendingUp size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Academic Progress Trend</Text>
                  <Text style={styles.cardSubtitle}>Semester GPA vs Cumulative CGPA</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                <View style={styles.trendRow}>
                  {academicSummary.history.map((trend) => {
                    const maxGpa = academicSummary.settings.maxGradePoint || 10;
                    const gpaPercent = Math.min(100, Math.max(10, (trend.gpa / maxGpa) * 100));
                    const cgpaPercent = Math.min(100, Math.max(10, (trend.cgpaToDate / maxGpa) * 100));

                    return (
                      <View key={trend.semesterNumber} style={styles.trendItem}>
                        <Text style={styles.trendSemLabel}>Sem {trend.semesterNumber}</Text>

                        {/* Dual Vertical Progress Bars */}
                        <View style={styles.trendBarTrack}>
                          <View style={[styles.trendBarFill, { height: `${gpaPercent}%`, backgroundColor: theme.colors.primary }]} />
                          <View style={[styles.trendBarFill, { height: `${cgpaPercent}%`, backgroundColor: '#059669' }]} />
                        </View>

                        <Text style={styles.trendGpaVal}>{trend.gpa.toFixed(2)}</Text>
                        <Text style={styles.trendCgpaVal}>CGPA: {trend.cgpaToDate.toFixed(2)}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* 3. Semester Selection & Courses Manager */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBox}>
                <BookOpen size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Semester Management</Text>
                <Text style={styles.cardSubtitle}>Select semester to enter course grades</Text>
              </View>
            </View>

            {/* Semester Selector Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semChipsScroll}>
              <View style={styles.semChipsRow}>
                {availableSemesterNumbers.map((num) => {
                  const isSelected = selectedSemNum === num;
                  const hasData = academicSummary?.semesters.some(
                    (s) => s.semesterNumber === num && s.courses.length > 0
                  );
                  const semGpa = academicSummary?.semesters.find((s) => s.semesterNumber === num)?.gpa;

                  return (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.semChip,
                        isSelected && styles.semChipSelected,
                        hasData && !isSelected && styles.semChipHasData,
                      ]}
                      onPress={() => handleSelectSemester(num)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.semChipText, isSelected && styles.semChipTextSelected]}>
                        Sem {num}
                      </Text>
                      {hasData && semGpa !== undefined && (
                        <View style={[styles.semChipBadge, isSelected && styles.semChipBadgeSelected]}>
                          <Text style={[styles.semChipBadgeText, isSelected && styles.semChipBadgeTextSelected]}>
                            {semGpa.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.addSemChip}
                  onPress={() => {
                    const nextNum = Math.max(...availableSemesterNumbers) + 1;
                    handleSelectSemester(nextNum);
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={14} color={theme.colors.textMuted} />
                  <Text style={styles.addSemChipText}>Add</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Semester Actions Bar */}
            <View style={styles.semActionsRow}>
              <TouchableOpacity
                style={styles.importBtn}
                onPress={handleImportCurriculum}
                disabled={importing}
                activeOpacity={0.8}
              >
                <Download size={14} color={theme.colors.primary} />
                <Text style={styles.importBtnText}>
                  {importing ? 'Importing...' : 'Import Subjects'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addSubjectBtn}
                onPress={handleAddSubject}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.addSubjectBtnText}>Add Subject</Text>
              </TouchableOpacity>

              {academicSummary?.semesters.some((s) => s.semesterNumber === selectedSemNum) && (
                <TouchableOpacity
                  style={styles.deleteSemBtn}
                  onPress={handleDeleteSemester}
                  activeOpacity={0.8}
                >
                  <Trash2 size={16} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>

            {/* Subject Cards */}
            {activeCourses.length === 0 ? (
              <View style={styles.emptyCoursesBox}>
                <Calculator size={36} color={theme.colors.textMuted} />
                <Text style={styles.emptyCoursesTitle}>No Subjects in Semester {selectedSemNum}</Text>
                <Text style={styles.emptyCoursesSub}>
                  Click "Import Subjects" to load registered courses with credits or "Add Subject" to enter manually.
                </Text>
              </View>
            ) : (
              <View style={styles.coursesList}>
                {activeCourses.map((course, idx) => {
                  const weighted = (course.credits * course.gradePoint).toFixed(1);

                  return (
                    <View key={course.id || idx} style={styles.courseCard}>
                      <View style={styles.courseHeader}>
                        <Text style={styles.courseIndex}>#{idx + 1}</Text>
                        <TouchableOpacity
                          style={styles.arrearToggle}
                          onPress={() => handleCourseChange(idx, 'isArrear', !course.isArrear)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              course.isArrear && styles.checkboxActive,
                            ]}
                          >
                            {course.isArrear && <CheckCircle2 size={13} color="#FFFFFF" />}
                          </View>
                          <Text style={styles.arrearToggleText}>Arrear Course</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeCourseBtn}
                          onPress={() => handleRemoveSubject(idx)}
                        >
                          <Trash2 size={15} color="#DC2626" />
                        </TouchableOpacity>
                      </View>

                      {/* Inputs Row 1: Code and Name */}
                      <View style={styles.inputRow}>
                        <View style={{ width: 85 }}>
                          <Text style={styles.inputLabel}>Code</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="CS3591"
                            value={course.subjectCode || ''}
                            onChangeText={(val) => handleCourseChange(idx, 'subjectCode', val)}
                            autoCapitalize="characters"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inputLabel}>Subject Name</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Distributed Computing"
                            value={course.subjectName}
                            onChangeText={(val) => handleCourseChange(idx, 'subjectName', val)}
                          />
                        </View>
                      </View>

                      {/* Inputs Row 2: Credits & Grade Picker */}
                      <View style={styles.inputRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inputLabel}>Credits</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="3.0"
                            keyboardType="numeric"
                            value={String(course.credits || '')}
                            onChangeText={(val) =>
                              handleCourseChange(idx, 'credits', parseFloat(val) || 0)
                            }
                          />
                        </View>

                        <View style={{ flex: 1.2 }}>
                          <Text style={styles.inputLabel}>Grade Obtained</Text>
                          <TouchableOpacity
                            style={styles.gradePickerTrigger}
                            onPress={() => setGradePickerIdx(idx)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.gradePickerText}>
                              {course.grade || 'Select Grade'} ({course.gradePoint} pts)
                            </Text>
                            <ChevronDown size={14} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Weighted Points Breakdown */}
                      <View style={styles.weightedRow}>
                        <Text style={styles.weightedText}>
                          Grade Points: <Text style={{ fontWeight: '700' }}>{course.gradePoint}</Text>
                        </Text>
                        <Text style={styles.weightedText}>
                          Credits × Points = <Text style={styles.weightedHighlight}>{weighted}</Text>
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {/* Real-time Semester Summary Footer */}
                <View style={styles.semSummaryBar}>
                  <View style={styles.semSummaryLeft}>
                    <Text style={styles.semSummaryCredits}>
                      {currentSemesterCalculation.totalCredits.toFixed(1)} Credits
                    </Text>
                    <Text style={styles.semSummaryPoints}>
                      {currentSemesterCalculation.totalGradePoints.toFixed(1)} Weighted Pts
                    </Text>
                  </View>

                  <View style={styles.semGpaBadge}>
                    <Text style={styles.semGpaLabel}>Semester GPA</Text>
                    <Text
                      style={[
                        styles.semGpaVal,
                        { color: getGpaColor(currentSemesterCalculation.gpa, academicSummary?.settings.maxGradePoint || 10) },
                      ]}
                    >
                      {currentSemesterCalculation.gpa.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveSemester}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Save size={16} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>Save Semester {selectedSemNum} Results</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 4. Guidelines Note */}
          <View style={styles.infoBanner}>
            <Info size={18} color={theme.colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.infoBannerText}>
              GPA is calculated using credit-weighted grade points:{'\n'}
              GPA = Sum(Credits × Grade Points) / Sum(Credits). Cleared arrear subjects are factored into CGPA based on your selected repeat-attempt policy.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Grade Selector Modal */}
      <Modal visible={gradePickerIdx !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Grade</Text>
              <TouchableOpacity onPress={() => setGradePickerIdx(null)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {activeGrades.map((g) => (
                <TouchableOpacity
                  key={g.grade}
                  style={styles.gradeOptionItem}
                  onPress={() => {
                    if (gradePickerIdx !== null) {
                      handleCourseChange(gradePickerIdx, 'grade', g.grade);
                    }
                    setGradePickerIdx(null);
                  }}
                >
                  <View>
                    <Text style={styles.gradeOptionLetter}>{g.grade}</Text>
                    {g.description && <Text style={styles.gradeOptionDesc}>{g.description}</Text>}
                  </View>
                  <Text style={styles.gradeOptionPoints}>{g.points} Points</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={isSettingsOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grading Scheme & Rules</Text>
              <TouchableOpacity onPress={() => setIsSettingsOpen(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.settingsSectionTitle}>Select Grading Scheme</Text>
              {PRESET_GRADING_SCHEMES.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.schemeOption,
                    tempSettings.gradingSchemeId === preset.id && styles.schemeOptionSelected,
                  ]}
                  onPress={() =>
                    setTempSettings((prev) => ({
                      ...prev,
                      gradingSchemeId: preset.id,
                      gradingSchemeName: preset.name,
                      maxGradePoint: preset.maxGradePoint,
                      passingMinPoints: preset.passingMinPoints,
                    }))
                  }
                >
                  <Text style={styles.schemeOptionTitle}>{preset.name}</Text>
                  <Text style={styles.schemeOptionDesc}>{preset.description}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.settingsSectionTitle, { marginTop: 16 }]}>
                Arrear & Repeat Policy for CGPA
              </Text>
              {(['latest_attempt', 'highest_attempt', 'all_attempts'] as RepeatAttemptPolicy[]).map((pol) => (
                <TouchableOpacity
                  key={pol}
                  style={[
                    styles.schemeOption,
                    tempSettings.repeatPolicy === pol && styles.schemeOptionSelected,
                  ]}
                  onPress={() => setTempSettings((prev) => ({ ...prev, repeatPolicy: pol }))}
                >
                  <Text style={styles.schemeOptionTitle}>
                    {pol === 'latest_attempt'
                      ? 'Latest Attempt (Recommended)'
                      : pol === 'highest_attempt'
                      ? 'Highest Attempt'
                      : 'All Attempts'}
                  </Text>
                  <Text style={styles.schemeOptionDesc}>
                    {pol === 'latest_attempt'
                      ? 'Cleared arrears replace earlier grades; credits are not double-counted.'
                      : pol === 'highest_attempt'
                      ? 'Best grade point among all attempts is preserved.'
                      : 'Every attempt is included in the cumulative calculation.'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsSettingsOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveSettings}>
                <Text style={styles.modalSaveText}>Save Configuration</Text>
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
    backgroundColor: theme.colors.background,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    padding: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  schemeTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '65%',
  },
  schemeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  settingsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  cgpaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 4,
  },
  cgpaValue: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cgpaMax: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  cardSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  trendRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  trendItem: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  trendSemLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textDark,
    marginBottom: 6,
  },
  trendBarTrack: {
    width: 24,
    height: 60,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 2,
    gap: 2,
    overflow: 'hidden',
  },
  trendBarFill: {
    width: 8,
    borderRadius: 4,
  },
  trendGpaVal: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: 6,
  },
  trendCgpaVal: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  semChipsScroll: {
    marginTop: 14,
    marginBottom: 6,
  },
  semChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  semChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  semChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  semChipHasData: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  semChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  semChipTextSelected: {
    color: '#FFFFFF',
  },
  semChipBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  semChipBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  semChipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  semChipBadgeTextSelected: {
    color: '#FFFFFF',
  },
  addSemChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSemChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  semActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  importBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  addSubjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addSubjectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteSemBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    marginLeft: 'auto',
  },
  emptyCoursesBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyCoursesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginTop: 8,
  },
  emptyCoursesSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  coursesList: {
    gap: 10,
    marginTop: 4,
  },
  courseCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 8,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  arrearToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  arrearToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  removeCourseBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 3,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: theme.colors.textDark,
    fontWeight: '600',
  },
  gradePickerTrigger: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradePickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  weightedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  weightedText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  weightedHighlight: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
  semSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 6,
  },
  semSummaryLeft: {
    gap: 2,
  },
  semSummaryCredits: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  semSummaryPoints: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  semGpaBadge: {
    alignItems: 'flex-end',
  },
  semGpaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  semGpaVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  gradeOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  gradeOptionLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  gradeOptionDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  gradeOptionPoints: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  settingsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textDark,
    marginBottom: 8,
  },
  schemeOption: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 8,
  },
  schemeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  schemeOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  schemeOptionDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
