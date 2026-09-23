import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Plus, Check, BookOpen, Layers, Hash } from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { createSubject } from '@/service/subject';

export default function AddSubjectScreen() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState('1');
  const [department, setDepartment] = useState('');
  const [credits, setCredits] = useState('3');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim() || !department.trim()) {
      Alert.alert('Required Fields', 'Please enter the Subject Name, Subject Code, and Department.');
      return;
    }

    setSubmitting(true);
    try {
      await createSubject({
        subject_name: name.trim(),
        subject_code: code.trim().toUpperCase(),
        semester: Number(semester),
        department: department.trim(),
        credits: Number(credits) || 3,
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
      Alert.alert('Error', err.message || 'Failed to create subject.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Add New Subject"
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
            <Text style={styles.successTitle}>Subject Added!</Text>
            <Text style={styles.successSubtitle}>
              The new curriculum subject has been created successfully.
            </Text>
          </View>
        ) : (
          <>
            {/* Header Banner */}
            <View style={styles.banner}>
              <View style={styles.bannerIcon}>
                <BookOpen size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>Curriculum Registration</Text>
                <Text style={styles.bannerSubtitle}>
                  Create a course subject for students to access study notes, lectures, and exams.
                </Text>
              </View>
            </View>

            {/* Subject Name */}
            <Text style={styles.inputLabel}>Subject Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Object Oriented Programming"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Subject Code */}
            <Text style={styles.inputLabel}>Subject Code *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., CS8392"
              placeholderTextColor={theme.colors.textMuted}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />

            {/* Semester Chips */}
            <Text style={styles.inputLabel}>Select Semester *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {semesters.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, semester === String(s) && styles.chipActive]}
                  onPress={() => setSemester(String(s))}
                >
                  <Text style={[styles.chipText, semester === String(s) && styles.chipTextActive]}>
                    Sem {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Department & Credits */}
            <View style={styles.rowTwo}>
              <View style={{ flex: 2 }}>
                <Text style={styles.inputLabel}>Department *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., CSE / IT"
                  placeholderTextColor={theme.colors.textMuted}
                  value={department}
                  onChangeText={setDepartment}
                  autoCapitalize="characters"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Credits</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="3"
                  placeholderTextColor={theme.colors.textMuted}
                  value={credits}
                  onChangeText={setCredits}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Description */}
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Overview of subject objectives and outcomes..."
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
                  <Text style={styles.submitBtnText}>Create Subject</Text>
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
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#1E40AF',
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
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
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
