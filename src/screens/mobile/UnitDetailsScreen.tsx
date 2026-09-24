import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  FileText,
  Sparkles,
  ChevronRight,
  BookOpen,
  Calendar,
  AlertCircle,
  Video as VideoIcon,
  Play,
  ExternalLink,
  Book as BookIcon,
  Clock,
  ListVideo,
  ClipboardList,
  CheckCircle2,
  Circle,
  Download,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { supabase } from '@/lib/supabase';
import { getVideos, getYoutubeThumbnail } from '@/service/videos';
import { getAssignments } from '@/service/assignments';
import { getBooks } from '@/service/books';
import { isUnitCompleted, toggleUnitCompletion } from '@/service/progress';
import { useArrearMotivation } from '@/hooks/useArrearMotivation';
import ArrearMotivationToast from '@/components/mobile/ArrearMotivationToast';
import { downloadPdf } from '@/utils/fileDownloader';
import type { Video, Book, Assignment } from '@/types';

type PdfItem = {
  id: string;
  title: string;
  url: string;
  file_url: string;
  created_at?: string;
};

type TabType = 'pdfs' | 'videos' | 'playlists' | 'assignments' | 'books';

export default function UnitDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { unitId, unitTitle, unitNumber, subjectId, subjectName } = route.params || {};

  const [currentUnitId, setCurrentUnitId] = useState<string>(unitId || '');
  const [currentUnitTitle, setCurrentUnitTitle] = useState<string>(unitTitle || `Unit ${unitNumber || ''}`);
  const [currentUnitNumber, setCurrentUnitNumber] = useState<number>(Number(unitNumber) || 1);
  const [unitDescription, setUnitDescription] = useState<string>('');

  const [activeTab, setActiveTab] = useState<TabType>('pdfs');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Arrear motivation for unit study
  const { isToastVisible, currentMessage, dismissToast } = useArrearMotivation({
    subjectId,
    isStudyActive: !loading,
  });

  const [isCompleted, setIsCompleted] = useState(false);
  const [togglingCompletion, setTogglingCompletion] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<Video[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  const loadUnitContent = useCallback(async () => {
    if (!subjectId && !unitId) return;
    setLoading(true);

    try {
      const isUuid = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      let resolvedUnitId = unitId || '';
      let resolvedTitle = unitTitle || `Unit ${unitNumber || ''}`;
      let resolvedNum = Number(unitNumber) || 1;
      let resolvedDesc = '';

      // 1. Check if unit exists in DB by ID or by subjectId + unitNumber
      if (isUuid(unitId)) {
        const { data: dbUnit } = await supabase
          .from('units')
          .select('*')
          .eq('id', unitId)
          .maybeSingle();

        if (dbUnit) {
          resolvedUnitId = dbUnit.id;
          resolvedTitle = dbUnit.unit_title || `Unit ${dbUnit.unit_number}`;
          resolvedNum = dbUnit.unit_number;
          resolvedDesc = dbUnit.description || '';
        }
      } else if (subjectId && unitNumber) {
        const { data: dbUnit } = await supabase
          .from('units')
          .select('*')
          .eq('subject_id', subjectId)
          .eq('unit_number', Number(unitNumber))
          .maybeSingle();

        if (dbUnit) {
          resolvedUnitId = dbUnit.id;
          resolvedTitle = dbUnit.unit_title || `Unit ${dbUnit.unit_number}`;
          resolvedNum = dbUnit.unit_number;
          resolvedDesc = dbUnit.description || '';
        }
      }

      setCurrentUnitId(resolvedUnitId);
      setCurrentUnitTitle(resolvedTitle);
      setCurrentUnitNumber(resolvedNum);
      setUnitDescription(resolvedDesc);

      // 2. Check if unit is marked completed
      const completedStatusPromise = isUnitCompleted(resolvedUnitId || unitId);

      // 3. Fetch PDFs from materials
      const materialsPromise = isUuid(resolvedUnitId)
        ? supabase
            .from('materials')
            .select('*')
            .eq('unit_id', resolvedUnitId)
            .or('material_type.ilike.pdf,file_url.ilike.%.pdf')
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] });

      // 4. Fetch Single Videos & Playlists & Assignments & Books
      const [completedStatus, materialsRes, allVids, assigns, bks] = await Promise.all([
        completedStatusPromise,
        materialsPromise,
        getVideos(subjectId, isUuid(resolvedUnitId) ? resolvedUnitId : undefined),
        getAssignments({ subjectId, unitId: isUuid(resolvedUnitId) ? resolvedUnitId : undefined }),
        getBooks(subjectId, isUuid(resolvedUnitId) ? resolvedUnitId : undefined),
      ]);

      setIsCompleted(completedStatus);

      const formattedPdfs = (materialsRes.data ?? []).map((m: any) => ({
        id: m.id,
        title: m.title || 'PDF Document',
        url: m.file_url,
        file_url: m.file_url,
        created_at: m.created_at,
      }));
      setPdfs(formattedPdfs);

      const singleVideos = (allVids || []).filter((v) => !v.is_playlist && v.video_type !== 'playlist');
      const playlistVideos = (allVids || []).filter((v) => v.is_playlist || v.video_type === 'playlist');

      setVideos(singleVideos);
      setPlaylists(playlistVideos);
      setAssignments(assigns || []);
      setBooks(bks || []);
    } catch (err) {
      console.error('Error fetching unit materials:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [unitId, unitTitle, unitNumber, subjectId]);

  const handleToggleCompletion = async () => {
    const targetId = currentUnitId || unitId;
    if (!targetId || togglingCompletion) return;
    const nextState = !isCompleted;
    setIsCompleted(nextState); // Optimistic UI update
    setTogglingCompletion(true);
    const res = await toggleUnitCompletion(targetId, nextState);
    if (!res.success) {
      // Revert if error
      setIsCompleted(!nextState);
    }
    setTogglingCompletion(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadUnitContent();
    }, [loadUnitContent])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadUnitContent();
  };

  const handleAskAi = (pdf: PdfItem) => {
    navigation.navigate('AIAssistant', {
      attachedPdf: {
        id: pdf.id,
        title: pdf.title,
        fileUrl: pdf.file_url,
      },
    });
  };

  const handleDownloadPdf = async (pdf: PdfItem) => {
    if (!pdf.file_url || downloadingPdfId) return;
    setDownloadingPdfId(pdf.id);
    try {
      await downloadPdf(pdf.file_url, pdf.title);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Uploaded by Instructor';
    try {
      const d = new Date(isoString);
      return `Added ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } catch {
      return 'Uploaded by Instructor';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={unitTitle || `Unit ${unitNumber || ''}`}
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Unit Info Box */}
        <View style={styles.unitHeaderCard}>
          <View style={styles.unitHeaderTopRow}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Unit {currentUnitNumber}</Text>
              </View>
              <Text style={styles.subjectSubText}>{subjectName}</Text>
            </View>

            {/* Toggle Completion Button */}
            <TouchableOpacity
              style={[
                styles.completionToggleBtn,
                isCompleted ? styles.completionToggleBtnDone : styles.completionToggleBtnPending,
              ]}
              onPress={handleToggleCompletion}
              disabled={togglingCompletion}
              activeOpacity={0.75}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 size={15} color="#059669" />
                  <Text style={styles.completionToggleTextDone}>Completed</Text>
                </>
              ) : (
                <>
                  <Circle size={15} color={theme.colors.textMuted} />
                  <Text style={styles.completionToggleTextPending}>Mark as Completed</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.unitTitleText}>{currentUnitTitle}</Text>
          {unitDescription ? (
            <Text style={styles.unitDescriptionText}>{unitDescription}</Text>
          ) : null}
        </View>

        {/* 5-Resource Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll}>
          <View style={styles.tabBar}>
            {/* PDFs */}
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'pdfs' && styles.tabBtnActive]}
              onPress={() => setActiveTab('pdfs')}
              activeOpacity={0.8}
            >
              <FileText size={14} color={activeTab === 'pdfs' ? '#FFFFFF' : theme.colors.textMuted} />
              <Text style={[styles.tabBtnText, activeTab === 'pdfs' && styles.tabBtnTextActive]}>
                PDFs ({pdfs.length})
              </Text>
            </TouchableOpacity>

            {/* Single Videos */}
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'videos' && styles.tabBtnActive]}
              onPress={() => setActiveTab('videos')}
              activeOpacity={0.8}
            >
              <VideoIcon size={14} color={activeTab === 'videos' ? '#FFFFFF' : theme.colors.textMuted} />
              <Text style={[styles.tabBtnText, activeTab === 'videos' && styles.tabBtnTextActive]}>
                Videos ({videos.length})
              </Text>
            </TouchableOpacity>

            {/* Playlists */}
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'playlists' && styles.tabBtnActive]}
              onPress={() => setActiveTab('playlists')}
              activeOpacity={0.8}
            >
              <ListVideo size={14} color={activeTab === 'playlists' ? '#FFFFFF' : theme.colors.textMuted} />
              <Text style={[styles.tabBtnText, activeTab === 'playlists' && styles.tabBtnTextActive]}>
                Playlists ({playlists.length})
              </Text>
            </TouchableOpacity>

            {/* Assignments */}
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'assignments' && styles.tabBtnActive]}
              onPress={() => setActiveTab('assignments')}
              activeOpacity={0.8}
            >
              <ClipboardList size={14} color={activeTab === 'assignments' ? '#FFFFFF' : theme.colors.textMuted} />
              <Text style={[styles.tabBtnText, activeTab === 'assignments' && styles.tabBtnTextActive]}>
                Assignments ({assignments.length})
              </Text>
            </TouchableOpacity>

            {/* Books */}
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'books' && styles.tabBtnActive]}
              onPress={() => setActiveTab('books')}
              activeOpacity={0.8}
            >
              <BookIcon size={14} color={activeTab === 'books' ? '#FFFFFF' : theme.colors.textMuted} />
              <Text style={[styles.tabBtnText, activeTab === 'books' && styles.tabBtnTextActive]}>
                Books ({books.length})
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading unit resources...</Text>
          </View>
        ) : (
          <>
            {/* 1. PDFs Tab */}
            {activeTab === 'pdfs' && (
              <View>
                {pdfs.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                      <AlertCircle size={32} color={theme.colors.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No PDFs Uploaded Yet</Text>
                    <Text style={styles.emptySubtitle}>
                      Your faculty will upload lecture notes and syllabus materials here soon.
                    </Text>
                  </View>
                ) : (
                  pdfs.map((pdf) => (
                    <TouchableOpacity
                      key={pdf.id}
                      style={styles.pdfCard}
                      onPress={() =>
                        navigation.navigate('PdfViewer', {
                          pdfId: pdf.id,
                          title: pdf.title,
                          fileUrl: pdf.file_url,
                          subjectName,
                          subjectId,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.pdfIconBox}>
                        <FileText size={22} color={theme.colors.danger} />
                      </View>

                      <View style={styles.pdfInfo}>
                        <Text style={styles.pdfTitle} numberOfLines={2}>
                          {pdf.title}
                        </Text>
                        <View style={styles.pdfMetaRow}>
                          <Calendar size={12} color={theme.colors.textMuted} />
                          <Text style={styles.pdfMetaDate}>{formatDate(pdf.created_at)}</Text>
                        </View>
                      </View>

                      <View style={styles.pdfActions}>
                        {/* Download PDF Button */}
                        <TouchableOpacity
                          style={styles.downloadPdfBtn}
                          onPress={() => handleDownloadPdf(pdf)}
                          disabled={downloadingPdfId === pdf.id}
                          activeOpacity={0.7}
                        >
                          {downloadingPdfId === pdf.id ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                          ) : (
                            <Download size={14} color={theme.colors.primary} />
                          )}
                          <Text style={styles.downloadPdfBtnText}>
                            {downloadingPdfId === pdf.id ? 'Saving...' : 'Download'}
                          </Text>
                        </TouchableOpacity>

                        {/* Ask AI Button */}
                        <TouchableOpacity
                          style={styles.askAiBtn}
                          onPress={() => handleAskAi(pdf)}
                          activeOpacity={0.7}
                        >
                          <Sparkles size={14} color={theme.colors.primary} />
                          <Text style={styles.askAiBtnText}>Ask AI</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* 2. Single Videos Tab */}
            {activeTab === 'videos' && (
              <View>
                {videos.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                      <VideoIcon size={32} color={theme.colors.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No Video Lectures</Text>
                    <Text style={styles.emptySubtitle}>
                      Curated video tutorials for this unit will appear here.
                    </Text>
                  </View>
                ) : (
                  videos.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={styles.videoCard}
                      onPress={() =>
                        navigation.navigate('YouTube', {
                          videoId: v.id,
                          video: v,
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <View style={styles.videoThumbContainer}>
                        <Image
                          source={{ uri: v.thumbnail || getYoutubeThumbnail(v.url) }}
                          style={styles.videoThumbnail}
                        />
                        <View style={styles.playIconBadge}>
                          <Play size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                        </View>
                      </View>

                      <View style={styles.videoInfo}>
                        <Text style={styles.videoTitle} numberOfLines={2}>
                          {v.title}
                        </Text>
                        <Text style={styles.videoChannel}>{v.channel || 'Curated Lecture'}</Text>
                        <View style={styles.videoMetaRow}>
                          <Clock size={11} color={theme.colors.textMuted} />
                          <Text style={styles.videoDuration}>{v.duration || '15:00'}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* 3. Playlists Tab */}
            {activeTab === 'playlists' && (
              <View>
                {playlists.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                      <ListVideo size={32} color={theme.colors.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No Playlists Attached</Text>
                    <Text style={styles.emptySubtitle}>
                      Complete topic courses and video series will be listed here.
                    </Text>
                  </View>
                ) : (
                  playlists.map((pl) => (
                    <TouchableOpacity
                      key={pl.id}
                      style={styles.playlistCard}
                      onPress={() => Linking.openURL(pl.url)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.playlistIconBox}>
                        <ListVideo size={22} color="#DC2626" />
                      </View>

                      <View style={styles.playlistInfo}>
                        <Text style={styles.playlistTitle} numberOfLines={2}>
                          {pl.title}
                        </Text>
                        <Text style={styles.playlistChannel}>{pl.channel || 'YouTube Course'}</Text>
                        <View style={styles.playlistBadgeRow}>
                          <View style={styles.playlistTag}>
                            <Text style={styles.playlistTagText}>Course Series</Text>
                          </View>
                          <Text style={styles.playlistDuration}>{pl.duration || 'Full Playlist'}</Text>
                        </View>
                      </View>

                      <ExternalLink size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* 4. Assignments Tab */}
            {activeTab === 'assignments' && (
              <View>
                {assignments.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                      <ClipboardList size={32} color={theme.colors.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No Assignments Due</Text>
                    <Text style={styles.emptySubtitle}>
                      Assignments and project tasks for this unit will appear here.
                    </Text>
                  </View>
                ) : (
                  assignments.map((a) => (
                    <View key={a.id} style={styles.assignmentCard}>
                      <View style={styles.assignmentHeader}>
                        <View style={styles.assignmentIconBox}>
                          <ClipboardList size={18} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.assignmentTitle}>{a.title}</Text>
                          <Text style={styles.assignmentMarks}>{a.max_marks} Total Marks</Text>
                        </View>
                      </View>

                      {a.description && (
                        <Text style={styles.assignmentDesc}>{a.description}</Text>
                      )}

                      <View style={styles.assignmentFooter}>
                        <View style={styles.metaRow}>
                          <Calendar size={13} color="#D97706" />
                          <Text style={styles.dueDateText}>Due: {a.due_date} {a.due_time || ''}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 5. Books & References Tab */}
            {activeTab === 'books' && (
              <View>
                {books.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                      <BookOpen size={32} color={theme.colors.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No Books or References</Text>
                    <Text style={styles.emptySubtitle}>
                      Recommended textbooks and reading materials will appear here.
                    </Text>
                  </View>
                ) : (
                  books.map((b) => (
                    <View key={b.id} style={styles.bookCard}>
                      <View style={styles.bookIconBox}>
                        <BookOpen size={22} color={theme.colors.primary} />
                      </View>

                      <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle}>{b.title}</Text>
                        {b.author && <Text style={styles.bookAuthor}>Author: {b.author}</Text>}
                        {b.edition && <Text style={styles.bookEdition}>Edition: {b.edition}</Text>}
                        {b.description && (
                          <Text style={styles.bookDescription} numberOfLines={3}>
                            {b.description}
                          </Text>
                        )}
                        {b.file_url && (
                          <TouchableOpacity
                            style={styles.openBookBtn}
                            onPress={() => Linking.openURL(b.file_url!)}
                          >
                            <ExternalLink size={13} color={theme.colors.primary} />
                            <Text style={styles.openBookBtnText}>View Reference Resource</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  unitHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  unitHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  subjectSubText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  completionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  completionToggleBtnDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  completionToggleBtnPending: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  completionToggleTextDone: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  completionToggleTextPending: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  unitTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  unitDescriptionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  tabBarScroll: {
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  pdfIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pdfInfo: {
    flex: 1,
    marginRight: 10,
  },
  pdfTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  pdfMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pdfMetaDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  pdfActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  downloadPdfBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  askAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  askAiBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  videoThumbContainer: {
    width: 100,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    marginRight: 12,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playIconBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 18,
    marginBottom: 3,
  },
  videoChannel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 3,
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoDuration: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  playlistIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
    marginRight: 8,
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  playlistChannel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  playlistBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playlistTag: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playlistTagText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  playlistDuration: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  assignmentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  assignmentMarks: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  assignmentDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  assignmentFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '700',
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  bookIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  bookEdition: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  bookDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  openBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  openBookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
