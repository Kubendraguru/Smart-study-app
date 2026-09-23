import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  User,
  Mail,
  Building,
  Hash,
  GraduationCap,
  LogOut,
  Shield,
  Briefcase,
  Settings,
  ChevronRight,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/service/auth';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.warn('Error loading profile in ProfileScreen:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const name = profile?.full_name || (role === 'teacher' ? 'Faculty Member' : 'Student');
  const designation = profile?.designation || (role === 'teacher' ? 'Faculty Member' : null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {role === 'teacher' ? (designation || 'Faculty / Instructor') : 'Undergraduate Student'}
            </Text>
          </View>
        </View>

        {/* Academic Details */}
        <Text style={styles.sectionTitle}>Account & Academic Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Mail size={18} color={theme.colors.textMuted} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoVal}>{user?.email || 'N/A'}</Text>
            </View>
          </View>

          {role === 'teacher' && designation && (
            <View style={styles.infoRow}>
              <Briefcase size={18} color={theme.colors.textMuted} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Designation</Text>
                <Text style={styles.infoVal}>{designation}</Text>
              </View>
            </View>
          )}

          {profile?.register_number && (
            <View style={styles.infoRow}>
              <Hash size={18} color={theme.colors.textMuted} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Register Number</Text>
                <Text style={styles.infoVal}>{profile.register_number}</Text>
              </View>
            </View>
          )}

          {profile?.department && (
            <View style={styles.infoRow}>
              <Building size={18} color={theme.colors.textMuted} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoVal}>{profile.department}</Text>
              </View>
            </View>
          )}

          {profile?.semester && (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <GraduationCap size={18} color={theme.colors.textMuted} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Current Semester</Text>
                <Text style={styles.infoVal}>Semester {profile.semester}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Teacher Settings Button */}
        {role === 'teacher' && (
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('TeacherSettings')}
            activeOpacity={0.8}
          >
            <Settings size={18} color={theme.colors.primary} />
            <Text style={styles.settingsBtnText}>Faculty Settings & Designation</Text>
            <ChevronRight size={18} color={theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color={theme.colors.danger} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
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
    paddingBottom: 32,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
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
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    color: theme.colors.primary,
    fontSize: 26,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 2,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  settingsBtnText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.dangerBg,
    borderRadius: 14,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
