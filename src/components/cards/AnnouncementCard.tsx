import { motion } from 'framer-motion';
import { AlertCircle, Info, Bell } from 'lucide-react';
import type { Announcement } from '@/types';
import Badge from '@/components/ui/Badge';

const priorityConfig = {
  high: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', badge: 'red' as const, label: 'High' },
  medium: { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50', badge: 'amber' as const, label: 'Medium' },
  low: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', badge: 'blue' as const, label: 'Low' },
};

export default function AnnouncementCard({ announcement, index = 0 }: { announcement: Announcement; index?: number }) {
  const config = priorityConfig[announcement.priority];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`relative bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100 ${!announcement.read ? 'ring-1 ring-blue-200' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{announcement.title}</h3>
            <Badge color={config.badge}>{config.label}</Badge>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-2">{announcement.message}</p>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-blue-600">{announcement.subject}</span>
            <span className="text-gray-400">{announcement.date}</span>
          </div>
        </div>
      </div>
      {!announcement.read && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500" />
      )}
    </motion.div>
  );
}
