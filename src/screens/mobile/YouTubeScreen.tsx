import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  Share,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  Play,
  Bookmark,
  Share2,
  ExternalLink,
  Video as VideoIcon,
  Clock,
  Eye,
  Sparkles,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getVideoById, getYoutubeThumbnail } from '@/service/videos';
import type { Video } from '@/types';

export default function YouTubeScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { videoId, video: initialVideo } = route.params || {};

  const [currentVideo, setCurrentVideo] = useState<Video | null>(initialVideo || null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const loadVideo = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { video, relatedVideos: related } = await getVideoById(id);
      if (video) {
        setCurrentVideo(video);
        setRelatedVideos(related);
      }
    } catch (err) {
      console.error('Error loading video details:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (videoId) {
      loadVideo(videoId);
    } else if (initialVideo) {
      setCurrentVideo(initialVideo);
      setLoading(false);
    }
  }, [videoId, initialVideo, loadVideo]);

  const handleOpenYoutube = async (url?: string) => {
    const targetUrl = url || currentVideo?.url;
    if (!targetUrl) return;

    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to open video link.');
    }
  };

  const handleShare = async () => {
    if (!currentVideo) return;
    try {
      await Share.share({
        message: `Watch "${currentVideo.title}" on Smart Study:\n${currentVideo.url}`,
      });
    } catch (err) {
      console.error('Error sharing video:', err);
    }
  };

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Lecture Video" showBack />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentVideo) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Lecture Video" showBack />
        <View style={styles.emptyContainer}>
          <VideoIcon size={40} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Video not found</Text>
          <Text style={styles.emptySubtitle}>The requested video could not be loaded.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const thumbUrl = currentVideo.thumbnail || getYoutubeThumbnail(currentVideo.url);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Lecture Video" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Video Thumbnail / Player Banner */}
        <TouchableOpacity
          style={styles.playerCard}
          onPress={() => handleOpenYoutube()}
          activeOpacity={0.9}
        >
          <Image source={{ uri: thumbUrl }} style={styles.thumbnailImage} resizeMode="cover" />
          <View style={styles.playOverlay}>
            <View style={styles.playButtonCircle}>
              <Play size={32} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.watchNowBadge}>Tap to Watch on YouTube</Text>
          </View>
        </TouchableOpacity>

        {/* Video Info Section */}
        <View style={styles.detailsCard}>
          <Text style={styles.videoTitle}>{currentVideo.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={13} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{currentVideo.duration || '15:00'}</Text>
            </View>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{currentVideo.channel || 'Curated Lecture'}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.watchMainBtn}
              onPress={() => handleOpenYoutube()}
              activeOpacity={0.8}
            >
              <ExternalLink size={16} color="#FFFFFF" />
              <Text style={styles.watchMainBtnText}>Open Video in App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconActionBtn, isBookmarked && styles.iconActionBtnActive]}
              onPress={toggleBookmark}
            >
              <Bookmark
                size={18}
                color={isBookmarked ? theme.colors.primary : theme.colors.textSecondary}
                fill={isBookmarked ? theme.colors.primary : 'none'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconActionBtn} onPress={handleShare}>
              <Share2 size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Related Videos */}
        {relatedVideos.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Related Unit Lessons ({relatedVideos.length})</Text>

            {relatedVideos.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.relatedCard}
                onPress={() => {
                  setCurrentVideo(item);
                  loadVideo(item.id);
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.thumbnail || getYoutubeThumbnail(item.url) }}
                  style={styles.relatedThumbnail}
                />
                <View style={styles.relatedInfo}>
                  <Text style={styles.relatedCardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.relatedCardChannel}>{item.channel || 'Educational'}</Text>
                  <View style={styles.relatedMetaRow}>
                    <Clock size={11} color={theme.colors.textMuted} />
                    <Text style={styles.relatedDuration}>{item.duration || '15:00'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  playerCard: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  playButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  watchNowBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  videoTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 23,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginHorizontal: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  watchMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  watchMainBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionBtnActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  relatedSection: {
    padding: 16,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
  },
  relatedCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
  },
  relatedThumbnail: {
    width: 100,
    height: 62,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    marginRight: 12,
  },
  relatedInfo: {
    flex: 1,
  },
  relatedCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 17,
    marginBottom: 4,
  },
  relatedCardChannel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  relatedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  relatedDuration: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
