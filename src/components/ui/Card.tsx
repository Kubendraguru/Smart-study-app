import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

export default function Card({ children, hoverable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm shadow-gray-200/60 border border-gray-100 ${hoverable ? 'transition-all duration-300 hover:shadow-md hover:shadow-gray-200 hover:-translate-y-0.5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
