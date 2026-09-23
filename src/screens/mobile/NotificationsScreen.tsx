import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Bell, AlertCircle, Info, Calendar } from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getAnnouncements } from '@/service/announcements';
import type { Announcement } from '@/types';

export default function NotificationsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Error loading student notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnnouncements();
  };

  const getPriorityTheme = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return {
          badgeBg: '#FEE2E2',
          badgeText: '#DC2626',
          iconBg: '#FEE2E2',
          iconColor: '#DC2626',
          label: 'High Priority',
        };
      case 'medium':
        return {
          badgeBg: '#FEF3C7',
          badgeText: '#D97706',
          iconBg: '#FEF3C7',
          iconColor: '#D97706',
          label: 'Important',
        };
      case 'low':
      default:
        return {
          badgeBg: '#DBEAFE',
          badgeText: '#2563EB',
          iconBg: '#DBEAFE',
          iconColor: '#2563EB',
          label: 'Notice',
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Notifications" showBack />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Bell size={32} color={theme.colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>
                You're all caught up! Faculty announcements and exam notices will appear here.
              </Text>
            </View>
          ) : (
            announcements.map((item) => {
              const pTheme = getPriorityTheme(item.priority);
              return (
                <View key={item.id} style={styles.notifCard}>
                  <View style={[styles.iconBox, { backgroundColor: pTheme.iconBg }]}>
                    <Bell size={18} color={pTheme.iconColor} />
                  </View>
                  <View style={styles.content}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.priorityBadge, { backgroundColor: pTheme.badgeBg }]}>
                        <Text style={[styles.priorityText, { color: pTheme.badgeText }]}>
                          {pTheme.label}
                        </Text>
                      </View>
                      <Text style={styles.timeText}>{item.date || 'Recent'}</Text>
                    </View>

                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.message}>{item.message}</Text>

                    <View style={styles.metaRow}>
                      <View style={styles.subjectChip}>
                        <Text style={styles.subjectChipText}>
                          {item.subject_name || item.subject || 'Curriculum'}
                        </Text>
                      </View>
                      {item.teacher_name && (
                        <Text style={styles.teacherNameText}>By {item.teacher_name}</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  teacherNameText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
});
