import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Subject } from '@/types';
import ProgressBar from '@/components/ui/ProgressBar';
import Badge from '@/components/ui/Badge';

const colorMap: Record<string, { bg: string; text: string; bar: string; badge: 'blue' | 'green' | 'amber' | 'red' | 'gray' }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-600', badge: 'blue' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-600', badge: 'green' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-500', badge: 'amber' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', badge: 'red' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', bar: 'bg-violet-500', badge: 'gray' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', bar: 'bg-cyan-500', badge: 'blue' },
};
export default function SubjectCard({
  subject,
  index = 0,
}: {
  subject: Subject;
  index?: number;
}) {
  const navigate = useNavigate();

  const colors = colorMap[subject.color] || colorMap.blue;

  const Icon =
    (LucideIcons as unknown as Record<string, LucideIcon>)[subject.icon] ||
    LucideIcons.BookOpen;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/subject/${subject.id}`)}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100 transition-all duration-300 hover:shadow-md hover:shadow-gray-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-3 mb-3">

        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}
        >
          <Icon size={24} className={colors.text} />
        </div>

        <div className="flex-1 min-w-0">

          {/* Code + Credits */}
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs font-medium text-gray-400">
              {subject.code}
            </span>

            <Badge color={colors.badge}>
              {subject.credits} Credits
            </Badge>

            {/* ARREAR BADGE */}
            {subject.isArrear && (
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
                ARREAR
              </span>
            )}
          </div>

          {/* Subject Name */}
          <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">
            {subject.name}
          </h3>

          {/* Previous Semester */}
          {subject.isArrear && (
            <p className="text-[11px] text-red-500 font-medium mt-1">
              Previous Semester {subject.semester}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 line-clamp-2 mb-3">
        {subject.description}
      </p>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">
            {subject.units.length} Units
          </span>

          <span className={`font-semibold ${colors.text}`}>
            {subject.progress}%
          </span>
        </div>

        <ProgressBar
          value={subject.progress}
          color={colors.bar}
          size="sm"
        />
      </div>
    </motion.button>
  );
}