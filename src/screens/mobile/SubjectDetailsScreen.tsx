import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  FileText,
  ChevronRight,
  Layers,
  Sparkles,
  Plus,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useArrearMotivation } from '@/hooks/useArrearMotivation';
import ArrearMotivationToast from '@/components/mobile/ArrearMotivationToast';

type UnitItem = {
  id: string;
  unit_number: number;
  unit_title: string;
  description: string;
  pdfCount: number;
  videoCount: number;
  bookCount: number;
};

export default function SubjectDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { role } = useAuth();

  const { subjectId, subjectName } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjectData, setSubjectData] = useState<any>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);

  // Arrear study motivation
  const { isToastVisible, currentMessage, dismissToast } = useArrearMotivation({
    subjectId,
    isStudyActive: !loading && !!subjectData,
  });

  const loadData = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);

    try {
      // 1. Fetch Subject
      const { data: subj } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      setSubjectData(subj);

      // 2. Fetch Units
      const { data: unitsList } = await supabase
        .from('units')
        .select('*')
        .eq('subject_id', subjectId)
        .order('unit_number', { ascending: true });

      const unitIds = (unitsList ?? []).map((u) => u.id);

      // 3. Count PDFs, Videos, and Books in each unit
      let pdfMap: Record<string, number> = {};
      let videoMap: Record<string, number> = {};
      let bookMap: Record<string, number> = {};

      if (unitIds.length > 0) {
        // Count PDFs
        const { data: mats } = await supabase
          .from('materials')
          .select('unit_id')
          .in('unit_id', unitIds)
          .or('material_type.ilike.pdf,file_url.ilike.%.pdf');

        (mats ?? []).forEach((m) => {
          pdfMap[m.unit_id] = (pdfMap[m.unit_id] || 0) + 1;
        });

        // Count Videos
        const { data: vids } = await supabase
          .from('videos')
          .select('unit_id')
          .in('unit_id', unitIds);

        (vids ?? []).forEach((v) => {
          videoMap[v.unit_id] = (videoMap[v.unit_id] || 0) + 1;
        });

        // Count Books
        const { data: bks } = await supabase
          .from('books')
          .select('unit_id')
          .in('unit_id', unitIds);

        (bks ?? []).forEach((b) => {
          bookMap[b.unit_id] = (bookMap[b.unit_id] || 0) + 1;
        });
      }

      const formattedUnits: UnitItem[] = (unitsList ?? []).map((u) => ({
        id: u.id,
        unit_number: u.unit_number,
        unit_title: u.unit_title || `Unit ${u.unit_number}`,
        description: u.description || '',
        pdfCount: pdfMap[u.id] || 0,
        videoCount: videoMap[u.id] || 0,
        bookCount: bookMap[u.id] || 0,
      }));

      setUnits(formattedUnits);
    } catch (err) {
      console.error('Error loading subject details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={subjectName || subjectData?.subject_name || 'Subject Details'}
        showBack
        rightAction={
          role === 'teacher' ? (
            <TouchableOpacity
              style={styles.addUnitHeaderBtn}
              onPress={() => navigation.navigate('AddUnit', { subjectId })}
              activeOpacity={0.7}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addUnitHeaderBtnText}>Add Unit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.aiHeaderBtn}
              onPress={() => navigation.navigate('AIAssistant')}
              activeOpacity={0.7}
            >
              <Sparkles size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )
        }
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading curriculum units...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Subject Banner */}
          <View style={styles.bannerCard}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>{subjectData?.subject_code || 'CODE'}</Text>
            </View>
            <Text style={styles.bannerTitle}>{subjectData?.subject_name || subjectName}</Text>
            <Text style={styles.bannerMeta}>
              Semester {subjectData?.semester || 1} · {subjectData?.department || 'General'} ·{' '}
              {subjectData?.credits || 3} Credits · {units.length} Units
            </Text>
          </View>

          {/* Units Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Syllabus & Units</Text>
            <Text style={styles.sectionCount}>{units.length} Units</Text>
          </View>

          {/* Empty state if no units */}
          {units.length === 0 && (
            <View style={styles.emptyUnitsBox}>
              <Layers size={36} color={theme.colors.textMuted} />
              <Text style={styles.emptyUnitsTitle}>No Units Added Yet</Text>
              {role === 'teacher' ? (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => navigation.navigate('AddUnit', { subjectId })}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.emptyAddBtnText}>Add Unit 1 Now</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.emptyUnitsSub}>
                  Your teacher will organize the course units and materials here soon.
                </Text>
              )}
            </View>
          )}

          {/* Units List */}
          {units.map((unit) => (
            <TouchableOpacity
              key={unit.id}
              style={styles.unitCard}
              onPress={() =>
                navigation.navigate('UnitDetails', {
                  unitId: unit.id,
                  unitTitle: unit.unit_title,
                  unitNumber: unit.unit_number,
                  subjectId,
                  subjectName: subjectName || subjectData?.subject_name,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.unitNumberBox}>
                <Text style={styles.unitNumberText}>{unit.unit_number}</Text>
              </View>

              <View style={styles.unitInfo}>
                <Text style={styles.unitTitle} numberOfLines={2}>
                  {unit.unit_title}
                </Text>
                <View style={styles.unitMetaRow}>
                  <Text style={styles.unitMetaText}>
                    {unit.pdfCount} {unit.pdfCount === 1 ? 'PDF' : 'PDFs'} · {unit.videoCount} {unit.videoCount === 1 ? 'Video' : 'Videos'} · {unit.bookCount} {unit.bookCount === 1 ? 'Book' : 'Books'}
                  </Text>
                </View>
              </View>

              <ChevronRight size={20} color={theme.colors.border} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ArrearMotivationToast
        visible={isToastVisible}
        message={currentMessage}
        onDismiss={dismissToast}
        position="bottom"
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  aiHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addUnitHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addUnitHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  bannerCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 10,
  },
  bannerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 24,
  },
  bannerMeta: {
    fontSize: 12,
    color: theme.colors.primaryLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  emptyUnitsBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  emptyUnitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyUnitsSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  unitNumberBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  unitNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  unitInfo: {
    flex: 1,
    marginRight: 8,
  },
  unitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  unitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unitMetaText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
