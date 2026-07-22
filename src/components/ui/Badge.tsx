import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray';
  size?: 'sm' | 'md';
}

const colors: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
};

export default function Badge({ children, color = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${colors[color]} ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}>
      {children}
    </span>
  );
}
