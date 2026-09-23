import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Heart } from 'lucide-react';
import type { MotivationalMessage } from '@/types';

interface ArrearMotivationToastProps {
  visible: boolean;
  message: MotivationalMessage | null;
  onDismiss: () => void;
  position?: 'top' | 'bottom';
  autoDismissMs?: number;
}

export default function ArrearMotivationToast({
  visible,
  message,
  onDismiss,
  position = 'bottom',
  autoDismissMs = 12000,
}: ArrearMotivationToastProps) {
  useEffect(() => {
    if (visible && message) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [visible, message, autoDismissMs, onDismiss]);

  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -40 : 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`fixed z-50 left-4 right-4 md:left-auto md:right-8 ${
            position === 'top' ? 'top-6' : 'bottom-6'
          } md:max-w-md pointer-events-auto`}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border-2 border-blue-200 shadow-blue-500/10 flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-2xl shadow-inner">
              {message.emoji || '💪'}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  Study Motivation
                </span>
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {message.language === 'tanglish' ? 'Tanglish' : 'English'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 leading-snug">
                {message.text}
              </h4>
              {message.subtext && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {message.subtext}
                </p>
              )}
            </div>

            <button
              onClick={onDismiss}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
              aria-label="Dismiss motivation"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
