import React, { useEffect, useState, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import {
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  ChevronDown,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getAllTeacherPdfs, getPdfViewTracking } from '@/service/tracking';
import type { PdfTrackingStats } from '@/types';

type Tab = 'viewed' | 'notViewed';

export default function PdfTrackingScreen() {
  const route = useRoute<any>();
  const initialPdfId = route.params?.pdfId || '';

  const [pdfs, setPdfs] = useState<
    { id: string; title: string; subjectName: string; unitTitle: string; createdAt: string }[]
  >([]);
  const [activePdfId, setActivePdfId] = useState<string>(initialPdfId);
  const [trackingStats, setTrackingStats] = useState<PdfTrackingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('viewed');
  const [search, setSearch] = useState('');
  const [showPdfModal, setShowPdfModal] = useState(false);

  const loadPdfsList = useCallback(async () => {
    setLoading(true);
    const list = await getAllTeacherPdfs();
    setPdfs(list);

    if (list.length > 0) {
      const selected = initialPdfId && list.some((p) => p.id === initialPdfId) ? initialPdfId : list[0].id;
      setActivePdfId(selected);
    } else {
      setLoading(false);
    }
  }, [initialPdfId]);

  const loadStats = useCallback(async (pdfId: string) => {
    setRefreshing(true);
    const result = await getPdfViewTracking(pdfId);
    setTrackingStats(result.stats);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadPdfsList();
  }, [loadPdfsList]);

  useEffect(() => {
    if (activePdfId) {
      loadStats(activePdfId);
    }
  }, [activePdfId, loadStats]);

  const onRefresh = () => {
    if (activePdfId) {
      loadStats(activePdfId);
    }
  };

  const filteredViewed = (trackingStats?.viewedStudents ?? []).filter((s) =>
    `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNotViewed = (trackingStats?.notViewedStudents ?? []).filter((s) =>
    `${s.studentName} ${s.registerNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const activePdf = pdfs.find((p) => p.id === activePdfId);

  const formatViewedTime = (isoString?: string) => {
    if (!isoString) return 'Viewed';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Viewed';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="PDF View Tracking"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            disabled={refreshing || !activePdfId}
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* PDF Selection Dropdown */}
        {pdfs.length > 0 && (
          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>SELECT PDF MATERIAL</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowPdfModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownInfo}>
                <Text style={styles.dropdownTitle} numberOfLines={1}>
                  {activePdf?.title || 'Select a PDF'}
                </Text>
                <Text style={styles.dropdownMeta} numberOfLines={1}>
                  {activePdf ? `${activePdf.subjectName} · ${activePdf.unitTitle}` : ''}
                </Text>
              </View>
              <ChevronDown size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading tracking statistics...</Text>
          </View>
        ) : !trackingStats ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No tracking records found</Text>
          </View>
        ) : (
          <>
            {/* Overview Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>Engagement Overview</Text>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentBadgeText}>{trackingStats.viewedPercentage}% Opened</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{trackingStats.totalStudents}</Text>
                  <Text style={styles.statLabel}>Enrolled</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: theme.colors.success }]}>
                    {trackingStats.viewedCount}
                  </Text>
                  <Text style={styles.statLabel}>Viewed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: theme.colors.danger }]}>
                    {trackingStats.notViewedCount}
                  </Text>
                  <Text style={styles.statLabel}>Not Viewed</Text>
                </View>
              </View>
            </View>

            {/* Tabs: Viewed vs Not Viewed */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'viewed' && styles.tabBtnActive]}
                onPress={() => setTab('viewed')}
                activeOpacity={0.8}
              >
                <CheckCircle2
                  size={15}
                  color={tab === 'viewed' ? theme.colors.success : theme.colors.textMuted}
                />
                <Text style={[styles.tabBtnText, tab === 'viewed' && styles.tabBtnTextActive]}>
                  Viewed ({trackingStats.viewedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, tab === 'notViewed' && styles.tabBtnActive]}
                onPress={() => setTab('notViewed')}
                activeOpacity={0.8}
              >
                <Clock
                  size={15}
                  color={tab === 'notViewed' ? theme.colors.danger : theme.colors.textMuted}
                />
                <Text style={[styles.tabBtnText, tab === 'notViewed' && styles.tabBtnTextActive]}>
                  Not Viewed ({trackingStats.notViewedCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <Search size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students or register number..."
                placeholderTextColor={theme.colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Students List */}
            {tab === 'viewed' ? (
              filteredViewed.length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No students have viewed this PDF yet.</Text>
                </View>
              ) : (
                filteredViewed.map((s) => (
                  <View key={s.studentId} style={styles.studentCard}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {s.studentName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{s.studentName}</Text>
                      <Text style={styles.studentReg}>Reg: {s.registerNumber}</Text>
                    </View>
                    <View style={styles.viewedTimeBadge}>
                      <CheckCircle2 size={12} color={theme.colors.success} />
                      <Text style={styles.viewedTimeText}>{formatViewedTime(s.viewedAt)}</Text>
                    </View>
                  </View>
                ))
              )
            ) : filteredNotViewed.length === 0 ? (
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>All enrolled students have viewed this PDF!</Text>
              </View>
            ) : (
              filteredNotViewed.map((s) => (
                <View key={s.studentId} style={styles.studentCard}>
                  <View style={[styles.studentAvatar, { backgroundColor: theme.colors.borderLight }]}>
                    <Text style={[styles.studentAvatarText, { color: theme.colors.textSecondary }]}>
                      {s.studentName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{s.studentName}</Text>
                    <Text style={styles.studentReg}>Reg: {s.registerNumber}</Text>
                  </View>
                  <View style={styles.notViewedBadge}>
                    <Text style={styles.notViewedText}>Not opened</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* PDF Picker Modal */}
      <Modal visible={showPdfModal} animationType="slide" onRequestClose={() => setShowPdfModal(false)}>
        <SafeAreaView style={styles.safeArea}>
          <AppHeader title="Select PDF to Track" showBack onBackPress={() => setShowPdfModal(false)} />
          <ScrollView contentContainerStyle={styles.modalList}>
            {pdfs.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.modalItem}
                onPress={() => {
                  setActivePdfId(p.id);
                  setShowPdfModal(false);
                }}
              >
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemTitle}>{p.title}</Text>
                  <Text style={styles.modalItemSub}>
                    {p.subjectName} · {p.unitTitle}
                  </Text>
                </View>
                {activePdfId === p.id && <Check size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  pickerSection: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dropdownInfo: {
    flex: 1,
    marginRight: 10,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dropdownMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  centerLoading: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  percentBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.borderLight,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.borderLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabBtnTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  studentAvatarText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  studentInfo: {
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  studentReg: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  viewedTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  viewedTimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.success,
  },
  notViewedBadge: {
    backgroundColor: theme.colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  notViewedText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  modalList: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  modalItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalItemSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
