import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop'> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 active:bg-blue-800',
  secondary: 'bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200',
  outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100',
  ghost: 'text-blue-600 hover:bg-blue-50 active:bg-blue-100',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-2xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
