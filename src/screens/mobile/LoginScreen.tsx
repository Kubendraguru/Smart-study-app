import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { GraduationCap, Mail, Lock, User, BookOpen, Building, Hash } from 'lucide-react-native';
import { theme } from '@/theme';
import { signIn, signUp } from '@/service/auth';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/types';

export default function LoginScreen() {
  const [role, setRole] = useState<Role>('student');
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [registerNumber, setRegisterNumber] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email.trim(), password);
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;

        const user = data.user;
        if (!user) throw new Error('User not created');

        await supabase.from('profiles').insert({
          id: user.id,
          full_name: name.trim(),
          role,
          register_number: registerNumber.trim(),
          college: college.trim(),
          department: department.trim(),
          semester: semester.trim() === '' ? null : Number(semester),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primaryDark} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header Banner */}
          <View style={styles.headerBanner}>
            <View style={styles.logoBadge}>
              <GraduationCap size={36} color={theme.colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Anna University</Text>
            <Text style={styles.headerSubtitle}>Smart Study Hub</Text>
          </View>

          {/* Form Card */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              {/* Role Toggle */}
              <View style={styles.roleToggleContainer}>
                <TouchableOpacity
                  style={[styles.roleTab, role === 'student' && styles.roleTabActive]}
                  onPress={() => setRole('student')}
                  activeOpacity={0.8}
                >
                  <BookOpen size={16} color={role === 'student' ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.roleTabText, role === 'student' && styles.roleTabTextActive]}>
                    Student
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleTab, role === 'teacher' && styles.roleTabActive]}
                  onPress={() => setRole('teacher')}
                  activeOpacity={0.8}
                >
                  <User size={16} color={role === 'teacher' ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.roleTabText, role === 'teacher' && styles.roleTabTextActive]}>
                    Teacher
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Sign in to continue your learning' : 'Sign up to start your journey'}
              </Text>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Sign up extra fields */}
              {!isLogin && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={styles.inputWrapper}>
                      <User size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your name"
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Register Number</Text>
                    <View style={styles.inputWrapper}>
                      <Hash size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 710021104001"
                        value={registerNumber}
                        onChangeText={setRegisterNumber}
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Department</Text>
                    <View style={styles.inputWrapper}>
                      <Building size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. CSE, IT, ECE"
                        value={department}
                        onChangeText={setDepartment}
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                  </View>

                  {role === 'student' && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Semester</Text>
                      <View style={styles.inputWrapper}>
                        <Hash size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. 5"
                          keyboardType="numeric"
                          value={semester}
                          onChangeText={setSemester}
                          placeholderTextColor={theme.colors.textMuted}
                        />
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="student@annauniv.edu"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Switch Sign in / Sign up */}
              <TouchableOpacity
                onPress={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                style={styles.switchModeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.switchModeText}>
                  {isLogin
                    ? "Don't have an account? "
                    : 'Already have an account? '}
                  <Text style={styles.switchModeTextHighlight}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBanner: {
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 20 : 40,
    paddingBottom: 48,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.primaryLight,
    marginTop: 2,
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginTop: -28,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.borderLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  roleTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  roleTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: theme.colors.dangerBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: theme.colors.text,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchModeText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  switchModeTextHighlight: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
