import { useParams } from 'react-router-dom';
import { Play, Bookmark, Share2, ThumbsUp, Eye } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import VideoCard from '@/components/cards/VideoCard';
import IconButton from '@/components/ui/IconButton';
import { subjects } from '@/data/subjects';

export default function YouTubeScreen() {
  const { videoId } = useParams();

  let video = null;
  let relatedVideos: typeof subjects[0]['units'][0]['videos'] = [];
  for (const subject of subjects) {
    for (const unit of subject.units) {
      const found = unit.videos.find((v) => v.id === videoId);
      if (found) {
        video = found;
        relatedVideos = unit.videos.filter((v) => v.id !== videoId);
        break;
      }
    }
    if (video) break;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto">
        <div className="relative aspect-video bg-gray-900">
          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center">
            <button className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Play size={28} className="text-blue-600 ml-1" fill="currentColor" />
            </button>
          </div>
          <div className="absolute top-4 left-4">
            <button
              onClick={() => window.history.back()}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
            >
              <span className="text-lg">‹</span>
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <h1 className="text-base font-bold text-gray-900 mb-2 leading-snug">{video.title}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Eye size={13} /> 1.2K views
            </span>
            <span>·</span>
            <span>{video.duration}</span>
          </div>

          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {video.channel[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{video.channel}</p>
                <p className="text-xs text-gray-500">Educational Channel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton variant="ghost">
                <ThumbsUp size={18} className="text-gray-500" />
              </IconButton>
              <IconButton variant={video.bookmarked ? 'active' : 'ghost'}>
                <Bookmark size={18} className={video.bookmarked ? 'fill-blue-500' : 'text-gray-500'} />
              </IconButton>
              <IconButton variant="ghost">
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
