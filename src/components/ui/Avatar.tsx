interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
};

export default function Avatar({ name, size = 'md', color = 'bg-blue-600' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}
