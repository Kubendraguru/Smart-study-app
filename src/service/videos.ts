import { supabase } from '@/lib/supabase';
import type { Video } from '@/types';
import { subjects as initialSubjects } from '@/data/subjects';

export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function extractPlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]list=([^#&?]+)/);
  return match ? match[1] : null;
}

export function getYoutubeThumbnail(url: string): string {
  const videoId = extractYoutubeId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60';
}

export async function getVideos(
  subjectId?: string,
  unitId?: string,
  options?: { isPlaylist?: boolean }
): Promise<Video[]> {
  try {
    let query = supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    const isUuid = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    if (subjectId) {
      if (!isUuid(subjectId)) {
        // Not a UUID, return fallback
        return [];
      }
      query = query.eq('subject_id', subjectId);
    }
    if (unitId) {
      if (!isUuid(unitId)) {
        // Not a UUID (e.g. placeholder unit), return empty
        return [];
      }
      query = query.eq('unit_id', unitId);
    }
    if (options?.isPlaylist !== undefined) {
      query = query.eq('is_playlist', options.isPlaylist);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      // Fallback to static subjects data if no Supabase records
      if (options?.isPlaylist) return []; // static fallback only has single videos
      const fallbackVideos: Video[] = [];
      for (const subj of initialSubjects) {
        if (!subjectId || subj.id === subjectId) {
          for (const unit of subj.units) {
            if (!unitId || unit.id === unitId) {
              fallbackVideos.push(
                ...unit.videos.map((v) => ({
                  ...v,
                  subject_id: subj.id,
                  unit_id: unit.id,
                  is_playlist: false,
                  video_type: 'video' as const,
                }))
              );
            }
          }
        }
      }
      return fallbackVideos;
    }

    return data.map((v: any) => ({
      id: v.id,
      title: v.title,
      channel: v.channel || 'Educational Channel',
      duration: v.duration || '15:00',
      thumbnail: v.thumbnail || getYoutubeThumbnail(v.url),
      url: v.url,
      subject_id: v.subject_id,
      unit_id: v.unit_id,
      teacher_id: v.teacher_id,
      is_playlist: Boolean(v.is_playlist || v.video_type === 'playlist'),
      video_type: v.video_type || (v.is_playlist ? 'playlist' : 'video'),
      created_at: v.created_at,
      bookmarked: false,
    }));
  } catch (err) {
    console.warn('Error fetching videos from Supabase:', err);
    return [];
  }
}

export async function getVideoById(id: string): Promise<{ video: Video | null; relatedVideos: Video[] }> {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      const currentVideo: Video = {
        id: data.id,
        title: data.title,
        channel: data.channel || 'Educational Channel',
        duration: data.duration || '15:00',
        thumbnail: data.thumbnail || getYoutubeThumbnail(data.url),
        url: data.url,
        subject_id: data.subject_id,
        unit_id: data.unit_id,
        teacher_id: data.teacher_id,
        is_playlist: Boolean(data.is_playlist || data.video_type === 'playlist'),
        video_type: data.video_type || (data.is_playlist ? 'playlist' : 'video'),
        created_at: data.created_at,
        bookmarked: false,
      };

      // Fetch related videos in same unit/subject
      const related = await getVideos(data.subject_id, data.unit_id, { isPlaylist: false });
      return {
        video: currentVideo,
        relatedVideos: related.filter((v) => v.id !== id),
      };
    }

    // Static fallback lookup
    for (const subj of initialSubjects) {
      for (const unit of subj.units) {
        const found = unit.videos.find((v) => v.id === id);
        if (found) {
          const currentVideo: Video = {
            ...found,
            subject_id: subj.id,
            unit_id: unit.id,
            is_playlist: false,
            video_type: 'video',
          };
          const related = unit.videos
            .filter((v) => v.id !== id)
            .map((v) => ({ ...v, subject_id: subj.id, unit_id: unit.id, is_playlist: false, video_type: 'video' as const }));

          return {
            video: currentVideo,
            relatedVideos: related,
          };
        }
      }
    }

    return { video: null, relatedVideos: [] };
  } catch (err) {
    console.warn('Error loading video by ID:', err);
    return { video: null, relatedVideos: [] };
  }
}

export async function addVideo(params: {
  title: string;
  url: string;
  subjectId: string;
  unitId: string;
  channel?: string;
  duration?: string;
  isPlaylist?: boolean;
}): Promise<Video> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('You must be logged in as a faculty member to link videos.');
  }

  const isPlaylist = Boolean(params.isPlaylist || extractPlaylistId(params.url) !== null);
  const thumbnail = getYoutubeThumbnail(params.url);

  const payload = {
    teacher_id: userData.user.id,
    subject_id: params.subjectId,
    unit_id: params.unitId,
    title: params.title.trim(),
    url: params.url.trim(),
    channel: params.channel?.trim() || (isPlaylist ? 'Curated Playlist' : 'Curated Lecture'),
    duration: params.duration?.trim() || (isPlaylist ? 'Playlist' : '15:00'),
    thumbnail,
    is_playlist: isPlaylist,
    video_type: isPlaylist ? 'playlist' : 'video',
  };

  const { data, error } = await supabase
    .from('videos')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Error adding video:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    channel: data.channel,
    duration: data.duration,
    thumbnail: data.thumbnail,
    url: data.url,
    subject_id: data.subject_id,
    unit_id: data.unit_id,
    teacher_id: data.teacher_id,
    is_playlist: data.is_playlist,
    video_type: data.video_type,
    created_at: data.created_at,
    bookmarked: false,
  };
}

export async function deleteVideo(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting video:', error);
    throw error;
  }

  return true;
}
