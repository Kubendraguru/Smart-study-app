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
import { useNavigation } from '@react-navigation/native';
import {
  User,
  Building,
  Mail,
  Shield,
  Save,
  Check,
  Award,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { getProfile, updateProfile } from '@/service/auth';

export default function TeacherSettingsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [department, setDepartment] = useState('');
  const [college, setCollege] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const designations = [
    'Assistant Professor',
    'Associate Professor',
    'Professor',
    'Head of Department (HOD)',
    'Visiting Faculty',
    'Lecturer',
  ];

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const profile = await getProfile(user.id);
        if (profile) {
          setFullName(profile.full_name || '');
          setDesignation(profile.designation || 'Assistant Professor');
          setDepartment(profile.department || '');
          setCollege(profile.college || '');
        }
      } catch (err) {
        console.error('Error loading teacher profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        designation: designation.trim(),
        department: department.trim(),
        college: college.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Faculty Settings"
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
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading profile settings...</Text>
          </View>
        ) : (
          <>
            {success && (
              <View style={styles.successBanner}>
                <Check size={18} color="#059669" />
                <Text style={styles.successBannerText}>Profile updated successfully!</Text>
              </View>
            )}

            {/* Teacher Profile Summary Card */}
            <View style={styles.profileSummaryCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {fullName ? fullName.charAt(0).toUpperCase() : 'T'}
                </Text>
              </View>
              <Text style={styles.profileName}>{fullName || 'Faculty Member'}</Text>
              <Text style={styles.profileRole}>{designation}</Text>
            </View>

            {/* Settings Form */}
            <Text style={styles.sectionTitle}>Instructor Information</Text>

            {/* Full Name */}
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={styles.inputWithIcon}>
              <User size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInputWithIcon}
                placeholder="e.g., Dr. Rajesh Kumar"
                placeholderTextColor={theme.colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Designation Selector */}
            <Text style={styles.inputLabel}>Academic Title / Designation</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {designations.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, designation === d && styles.chipActive]}
                  onPress={() => setDesignation(d)}
                >
                  <Text style={[styles.chipText, designation === d && styles.chipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Department */}
            <Text style={styles.inputLabel}>Department</Text>
            <View style={styles.inputWithIcon}>
              <Building size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInputWithIcon}
                placeholder="e.g., Computer Science & Engineering"
                placeholderTextColor={theme.colors.textMuted}
                value={department}
                onChangeText={setDepartment}
              />
            </View>

            {/* College */}
            <Text style={styles.inputLabel}>College / Institution</Text>
            <View style={styles.inputWithIcon}>
              <Award size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInputWithIcon}
                placeholder="e.g., University College of Engineering"
                placeholderTextColor={theme.colors.textMuted}
                value={college}
                onChangeText={setCollege}
              />
            </View>

            {/* Read-Only Email */}
            <Text style={styles.inputLabel}>Account Email (Linked)</Text>
            <View style={[styles.inputWithIcon, styles.disabledInput]}>
              <Mail size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <Text style={styles.disabledText}>{user?.email || 'N/A'}</Text>
            </View>

            {/* Role Badge */}
            <Text style={styles.inputLabel}>Account Role</Text>
            <View style={[styles.inputWithIcon, styles.disabledInput]}>
              <Shield size={18} color={theme.colors.primary} style={styles.inputIcon} />
              <Text style={[styles.disabledText, { color: theme.colors.primary, fontWeight: '700' }]}>
                Faculty / Teacher (Verified)
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.saveBtnContent}>
                  <Save size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Profile Settings</Text>
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
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  profileSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
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
  disabledInput: {
    backgroundColor: '#F8FAFC',
    borderColor: theme.colors.borderLight,
    paddingVertical: 12,
  },
  disabledText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  saveBtn: {
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
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
