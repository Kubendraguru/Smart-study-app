import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageContainerProps {
  children: ReactNode;
  showBottomNav?: boolean;
  noPadding?: boolean;
}

export default function PageContainer({ children, showBottomNav = false, noPadding = false }: PageContainerProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`max-w-md mx-auto ${noPadding ? '' : 'px-4'} ${showBottomNav ? 'pb-24' : 'pb-8'}`}
      >
        {children}
      </motion.main>
    </div>
  );
}
