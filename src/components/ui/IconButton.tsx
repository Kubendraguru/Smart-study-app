import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop'> {
  children: ReactNode;
  variant?: 'default' | 'active' | 'ghost';
}

const variants = {
  default: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
  active: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  ghost: 'text-gray-500 hover:bg-gray-50',
};

export default function IconButton({ children, variant = 'default', className = '', ...props }: IconButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      className={`p-2 rounded-xl transition-colors duration-200 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
