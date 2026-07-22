import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function ProgressBar({
  value,
  max = 100,
  color = 'bg-blue-600',
  showLabel = false,
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">{percentage.toFixed(0)}% complete</span>
        </div>
      )}
    </div>
  );
}
