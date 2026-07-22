import { motion } from 'framer-motion';
import { FileText, ClipboardList, Bell, Info } from 'lucide-react';
import type { Notification } from '@/types';

const typeConfig = {
  announcement: { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50' },
  material: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  assignment: { icon: ClipboardList, color: 'text-red-500', bg: 'bg-red-50' },
  general: { icon: Info, color: 'text-gray-500', bg: 'bg-gray-100' },
};

export default function NotificationCard({ notification, index = 0 }: { notification: Notification; index?: number }) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-200/60 ${!notification.read ? 'ring-1 ring-blue-200' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm">{notification.title}</h3>
          {!notification.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{notification.message}</p>
        <span className="text-xs text-gray-400 mt-1 block">{notification.date}</span>
      </div>
    </motion.div>
  );
}
