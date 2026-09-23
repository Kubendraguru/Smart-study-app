import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Bookmark, Share2, ThumbsUp, Eye, Loader2, ArrowLeft } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import VideoCard from '@/components/cards/VideoCard';
import IconButton from '@/components/ui/IconButton';
import { getVideoById, extractYoutubeId, getYoutubeThumbnail } from '@/service/videos';
import type { Video } from '@/types';

export default function YouTubeScreen() {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    async function load() {
      if (!videoId) return;
      setLoading(true);
      setIsPlaying(false);
      try {
        const { video: vid, relatedVideos: rel } = await getVideoById(videoId);
        setVideo(vid);
        setRelatedVideos(rel);
        setBookmarked(!!vid?.bookmarked);
      } catch (err) {
        console.error('Error loading video:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [videoId]);

  if (loading) {
    return (
      <>
        <AppHeader title="Lecture Video" showBack />
        <PageContainer>
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        </PageContainer>
      </>
    );
  }

  if (!video) {
    return (
      <>
        <AppHeader title="Video" showBack />
        <PageContainer>
          <div className="pt-20 text-center text-gray-500">Video not found.</div>
        </PageContainer>
      </>
    );
  }

  const ytId = extractYoutubeId(video.url);
  const thumbnail = video.thumbnail || getYoutubeThumbnail(video.url);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto">
        <div className="relative aspect-video bg-gray-900">
          {isPlaying && ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <img src={thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setIsPlaying(true)}
                  className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <Play size={28} className="text-blue-600 ml-1" fill="currentColor" />
                </button>
              </div>
            </>
          )}

          <div className="absolute top-4 left-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <h1 className="text-base font-bold text-gray-900 mb-2 leading-snug">{video.title}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Eye size={13} /> Curated Lecture
            </span>
            <span>·</span>
            <span>{video.duration || '15:00'}</span>
          </div>

          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {(video.channel || 'E')[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{video.channel || 'Curated Channel'}</p>
                <p className="text-xs text-gray-500">Educational Resource</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton variant="ghost">
                <ThumbsUp size={18} className="text-gray-500" />
              </IconButton>
              <IconButton
                variant={bookmarked ? 'active' : 'ghost'}
                onClick={() => setBookmarked(!bookmarked)}
              >
                <Bookmark size={18} className={bookmarked ? 'fill-blue-500 text-blue-500' : 'text-gray-500'} />
              </IconButton>
              <IconButton
                variant="ghost"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: video.title, url: video.url }).catch(() => {});
                  }
                }}
              >
                <Share2 size={18} className="text-gray-500" />
              </IconButton>
            </div>
          </div>

          {relatedVideos.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Related Videos</h2>
              <div className="space-y-3">
                {relatedVideos.map((v, i) => (
                  <VideoCard key={v.id} video={v} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
