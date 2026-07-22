import { motion } from 'framer-motion';
import { Play, Bookmark, Share2, Clock } from 'lucide-react';
import type { Video } from '@/types';
import IconButton from '@/components/ui/IconButton';

export default function VideoCard({ video, index = 0, onClick }: { video: Video; index?: number; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm shadow-gray-200/60 border border-gray-100 transition-all duration-300 hover:shadow-md hover:shadow-gray-200"
    >
      <button onClick={onClick} className="w-full text-left relative">
        <div className="relative aspect-video bg-gray-100">
          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play size={20} className="text-blue-600 ml-0.5" fill="currentColor" />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
            <Clock size={10} />
            {video.duration}
          </div>
        </div>
      </button>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">{video.title}</h3>
        <p className="text-xs text-gray-500 mb-2">{video.channel}</p>
        <div className="flex items-center gap-1">
          <IconButton variant={video.bookmarked ? 'active' : 'ghost'} className="flex-1 justify-center">
            <Bookmark size={16} className={video.bookmarked ? 'fill-blue-500' : ''} />
          </IconButton>
          <IconButton variant="ghost" className="flex-1 justify-center">
            <Share2 size={16} />
          </IconButton>
        </div>
      </div>
    </motion.div>
  );
}
