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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Video,
  ListVideo,
  Link2,
  CheckCircle2,
  BookOpen,
  Check,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { addVideo, extractYoutubeId, extractPlaylistId, getYoutubeThumbnail } from '@/service/videos';
import { getSubjects } from '@/service/subject';
import { supabase } from '@/lib/supabase';

export default function AddYoutubeScreen() {
  const navigation = useNavigation<any>();

  // Mode: 'video' | 'playlist'
  const [mode, setMode] = useState<'video' | 'playlist'>('video');

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');
  const [duration, setDuration] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadSubjs() {
      try {
        const subjs = await getSubjects();
        setSubjects(subjs || []);
        if (subjs && subjs.length > 0) {
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

  // Fetch units when subject changes
  useEffect(() => {
    async function loadUnitsForSubject() {
      if (!selectedSubjectId) {
        setUnits([]);
        setSelectedUnitId('');
        return;
      }
      try {
        const { data } = await supabase
          .from('units')
          .select('*')
          .eq('subject_id', selectedSubjectId)
          .order('unit_number', { ascending: true });

        setUnits(data || []);
        if (data && data.length > 0) {
          setSelectedUnitId(data[0].id);
        } else {
          setSelectedUnitId('');
        }
      } catch (err) {
        console.error('Error fetching units for subject:', err);
      }
    }
    loadUnitsForSubject();
  }, [selectedSubjectId]);

  const previewThumbnail = url ? getYoutubeThumbnail(url) : null;
  const isPlaylistDetected = extractPlaylistId(url) !== null;
  const isVideoDetected = extractYoutubeId(url) !== null;

  const handleSubmit = async () => {
    if (!url.trim() || !title.trim() || !selectedSubjectId || !selectedUnitId) {
      Alert.alert('Required Fields', 'Please fill in the URL, title, subject, and unit.');
      return;
    }

    setSubmitting(true);
    try {
      await addVideo({
        title: title.trim(),
        url: url.trim(),
        subjectId: selectedSubjectId,
        unitId: selectedUnitId,
        channel: channel.trim() || (mode === 'playlist' ? 'Curated Playlist' : 'Curated Lecture'),
        duration: duration.trim() || (mode === 'playlist' ? 'Full Playlist' : '15:00'),
        isPlaylist: mode === 'playlist' || isPlaylistDetected,
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
      Alert.alert('Error', err.message || 'Failed to add video resource.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={mode === 'playlist' ? 'Add YouTube Playlist' : 'Add YouTube Video'}
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
            <Text style={styles.successTitle}>
              {mode === 'playlist' ? 'Playlist Added!' : 'Video Link Added!'}
            </Text>
            <Text style={styles.successSubtitle}>
              Students can now access this {mode === 'playlist' ? 'curated playlist' : 'lecture video'} under the selected unit.
            </Text>
          </View>
        ) : (
          <>
            {/* Mode Switcher Tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'video' && styles.modeTabActive]}
                onPress={() => setMode('video')}
                activeOpacity={0.8}
              >
                <Video size={16} color={mode === 'video' ? '#DC2626' : theme.colors.textMuted} />
                <Text style={[styles.modeTabText, mode === 'video' && styles.modeTabTextActive]}>
                  Single Video
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, mode === 'playlist' && styles.modeTabActive]}
                onPress={() => setMode('playlist')}
                activeOpacity={0.8}
              >
                <ListVideo size={16} color={mode === 'playlist' ? '#DC2626' : theme.colors.textMuted} />
                <Text style={[styles.modeTabText, mode === 'playlist' && styles.modeTabTextActive]}>
                  Full Playlist
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.banner}>
              <View style={styles.bannerIcon}>
                {mode === 'playlist' ? (
                  <ListVideo size={24} color="#DC2626" />
                ) : (
                  <Video size={24} color="#DC2626" />
                )}
              </View>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>
                  {mode === 'playlist' ? 'Link Video Course Playlist' : 'Curate Single Lecture'}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {mode === 'playlist'
                    ? 'Paste a YouTube playlist URL (https://www.youtube.com/playlist?list=...) to give students access to the complete lecture series.'
                    : 'Paste any YouTube tutorial or lecture URL to attach it directly to the curriculum unit.'}
                </Text>
              </View>
            </View>

            {/* YouTube URL */}
            <Text style={styles.inputLabel}>
              {mode === 'playlist' ? 'YouTube Playlist URL *' : 'YouTube Video URL *'}
            </Text>
            <View style={styles.inputWithIcon}>
              <Link2 size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInputWithIcon}
                placeholder={
                  mode === 'playlist'
                    ? 'https://www.youtube.com/playlist?list=PL...'
                    : 'https://www.youtube.com/watch?v=...'
                }
                placeholderTextColor={theme.colors.textMuted}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
              />
            </View>

            {/* Thumbnail / Status Preview */}
            {previewThumbnail && (isVideoDetected || isPlaylistDetected) && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: previewThumbnail }} style={styles.previewImage} />
                <View style={styles.previewBadge}>
                  <CheckCircle2 size={14} color="#059669" />
                  <Text style={styles.previewBadgeText}>
                    {isPlaylistDetected ? 'Valid Playlist Link' : 'Valid YouTube Link'}
                  </Text>
                </View>
              </View>
            )}

            {/* Resource Title */}
            <Text style={styles.inputLabel}>
              {mode === 'playlist' ? 'Playlist Title *' : 'Video Title *'}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                mode === 'playlist'
                  ? 'e.g., Complete Operating Systems Course (Gate Smashers)'
                  : 'e.g., Process Scheduling Algorithms Explained'
              }
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Subject Selector */}
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
                      {s.subject_code || s.subject_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Unit Selector */}
            <Text style={styles.inputLabel}>Select Unit *</Text>
            {units.length === 0 ? (
              <Text style={styles.emptyUnitsText}>No units found for this subject.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {units.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.chip, selectedUnitId === u.id && styles.chipActive]}
                    onPress={() => setSelectedUnitId(u.id)}
                  >
                    <Text style={[styles.chipText, selectedUnitId === u.id && styles.chipTextActive]}>
                      Unit {u.unit_number}: {u.unit_title || `Unit ${u.unit_number}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Optional Channel & Duration */}
            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Channel Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Gate Smashers"
                  placeholderTextColor={theme.colors.textMuted}
                  value={channel}
                  onChangeText={setChannel}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>
                  {mode === 'playlist' ? 'Videos / Note' : 'Duration'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={mode === 'playlist' ? 'e.g., 24 Videos' : 'e.g., 18:30'}
                  placeholderTextColor={theme.colors.textMuted}
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            </View>

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
                <Text style={styles.submitBtnText}>
                  {mode === 'playlist' ? 'Attach Playlist to Unit' : 'Add Video Link'}
                </Text>
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
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  modeTabTextActive: {
    color: '#DC2626',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#B91C1C',
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
  previewContainer: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    height: 150,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  previewBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
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
  emptyUnitsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
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
