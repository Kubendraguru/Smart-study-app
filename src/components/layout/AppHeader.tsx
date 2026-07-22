import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: ReactNode;
}

export default function AppHeader({ title, showBack = false, rightAction }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-xl text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft size={24} />
            </motion.button>
          )}
          <h1 className="font-bold text-gray-900 text-base truncate">{title}</h1>
        </div>
        {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
      </div>
    </header>
  );
}
