import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle, Sparkles, X, Award, Flame } from 'lucide-react';
import Button from '@/components/ui/Button';
import { getRandomPassCelebrationMessage } from '@/service/arrearMotivation';

interface ArrearPassCelebrationModalProps {
  isOpen: boolean;
  subjectName?: string;
  subjectCode?: string;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#2563EB', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ArrearPassCelebrationModal({
  isOpen,
  subjectName,
  subjectCode,
  onClose,
}: ArrearPassCelebrationModalProps) {
  const [message, setMessage] = useState(getRandomPassCelebrationMessage());

  useEffect(() => {
    if (isOpen) {
      setMessage(getRandomPassCelebrationMessage());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        {/* Floating Confetti Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => {
            const left = `${Math.random() * 100}%`;
            const bg = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
            const size = Math.random() * 8 + 6;
            const delay = Math.random() * 0.6;
            const duration = Math.random() * 2 + 2;

            return (
              <motion.div
                key={i}
                initial={{ y: -40, x: 0, opacity: 1, rotate: 0 }}
                animate={{
                  y: '100vh',
                  x: (i % 2 === 0 ? 1 : -1) * (Math.random() * 120 + 30),
                  opacity: [0, 1, 1, 0],
                  rotate: (i % 2 === 0 ? 360 : -360) + i * 20,
                }}
                transition={{
                  duration,
                  delay,
                  ease: 'easeOut',
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
                style={{
                  position: 'absolute',
                  top: '-5%',
                  left,
                  width: size,
                  height: i % 3 === 0 ? size * 1.8 : size,
                  backgroundColor: bg,
                  borderRadius: i % 2 === 0 ? '50%' : '2px',
                }}
              />
            );
          })}
        </div>

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 text-center z-10"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-all"
            aria-label="Close celebration"
          >
            <X size={18} />
          </button>

          {/* Trophy Avatar with Pulsing Effect */}
          <div className="relative mx-auto w-24 h-24 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/15">
            <Trophy size={48} className="text-amber-500 animate-bounce" />
            <div className="absolute -top-1 -right-1 bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow">
              <Sparkles size={14} />
            </div>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <CheckCircle size={14} className="text-emerald-600" />
            Arrear Cleared & Passed
          </div>

          <h3 className="text-2xl font-black text-gray-900 mb-2">
            You Cleared It! 🎉
          </h3>

          <p className="text-sm font-semibold text-gray-700 leading-relaxed mb-5">
            {message}
          </p>

          {/* Subject Box */}
          {subjectName && (
            <div className="bg-slate-50 border border-gray-200/80 rounded-2xl p-4 mb-5">
              {subjectCode && (
                <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md mb-1 uppercase tracking-wide">
                  {subjectCode}
                </span>
              )}
              <h4 className="text-sm font-bold text-gray-900 line-clamp-2">
                {subjectName}
              </h4>
            </div>
          )}

          <p className="text-xs text-gray-500 leading-normal mb-6 max-w-sm mx-auto">
            Every backlog conquered is a testament to your hard work, persistence, and continuous learning. Keep shining!
          </p>

          <Button fullWidth size="lg" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20">
            <Award size={18} className="mr-2" />
            Continue Celebrating 🚀
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
