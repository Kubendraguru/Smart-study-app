import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  onActionClick?: () => void;
}

export default function SectionHeader({ title, action = 'See all', onActionClick }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {onActionClick && (
        <button
          onClick={onActionClick}
          className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {action}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
