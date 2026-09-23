import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Plus, Check, BookOpen, Layers } from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getSubjects, createUnit } from '@/service/subject';

export default function AddUnitScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const initialSubjectId = route.params?.subjectId || '';

  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [unitNumber, setUnitNumber] = useState('1');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadSubjs() {
      try {
        const subjs = await getSubjects();
        setSubjects(subjs || []);
        if (!selectedSubjectId && subjs && subjs.length > 0) {
          setSelectedSubjectId(subjs[0].id);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      } finally {
        setLoadingSubjects(false);
      }
    }
    loadSubjs();
  }, []);

  const handleSubmit = async () => {
    if (!selectedSubjectId) {
      Alert.alert('Required', 'Please select a subject.');
      return;
    }

    if (!unitNumber.trim() || !title.trim()) {
      Alert.alert('Required Fields', 'Please enter the unit number and unit title.');
      return;
    }

    setSubmitting(true);
    try {
      await createUnit({
        subject_id: selectedSubjectId,
        unit_number: Number(unitNumber),
        unit_title: title.trim(),
        description: description.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('TeacherTabs');
        }
      }, 1500);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create unit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Add New Unit"
        showBack
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('TeacherTabs');
          }
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {success ? (
          <View style={styles.successBox}>
            <View style={styles.successIconCircle}>
              <Check size={36} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Unit Added!</Text>
            <Text style={styles.successSubtitle}>
              The syllabus unit has been successfully attached to the subject.
            </Text>
          </View>
        ) : (
          <>
            {/* Header Banner */}
            <View style={styles.banner}>
              <View style={styles.bannerIcon}>
                <Layers size={24} color="#D97706" />
              </View>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>Unit Module Setup</Text>
                <Text style={styles.bannerSubtitle}>
                  Add chapters or units under a subject so students can organize their notes and videos.
                </Text>
              </View>
            </View>

            {/* Select Subject */}
            <Text style={styles.inputLabel}>Select Subject *</Text>
            {loadingSubjects ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, selectedSubjectId === s.id && styles.chipActive]}
                    onPress={() => setSelectedSubjectId(s.id)}
                  >
                    <Text style={[styles.chipText, selectedSubjectId === s.id && styles.chipTextActive]}>
                      {s.subject_code} — {s.subject_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Unit Number */}
            <Text style={styles.inputLabel}>Unit Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 1"
              placeholderTextColor={theme.colors.textMuted}
              value={unitNumber}
              onChangeText={setUnitNumber}
              keyboardType="numeric"
            />

            {/* Unit Title */}
            <Text style={styles.inputLabel}>Unit Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Introduction & Asymptotic Notations"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Unit Description */}
            <Text style={styles.inputLabel}>Unit Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Brief summary of key topics covered in this unit..."
              placeholderTextColor={theme.colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Add Unit</Text>
                </View>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 14,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  chipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.primary,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 32,
  },
});
