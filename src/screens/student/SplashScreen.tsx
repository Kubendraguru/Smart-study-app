import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/onboarding'), 2400);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-900 flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Ambient background glow */}
      <div className="absolute w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none -top-20 -left-20 animate-pulse" />
      <div className="absolute w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 animate-pulse" />

      {/* Main Logo Container with Spring & Pulse Animation */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 220,
          damping: 18,
          duration: 0.9,
        }}
        className="relative mb-6"
      >
        <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white/95 p-2 shadow-2xl shadow-black/30 flex items-center justify-center border-4 border-yellow-400/80 backdrop-blur-md">
          <motion.img
            src="/logo.png"
            alt="SRM MCET Logo"
            className="w-full h-full object-contain rounded-full"
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.95, 1.02, 0.98, 1] }}
            transition={{ delay: 0.5, duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
          />
        </div>
      </motion.div>

      {/* Brand Title & Subtitle with Staggered Entrance */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
        className="text-center space-y-1.5 z-10"
      >
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide drop-shadow-md">
          SRM MCET
        </h1>
        <p className="text-blue-100 text-sm sm:text-base font-semibold tracking-wider">
          Smart Study Hub
        </p>
        <p className="text-blue-200/80 text-xs font-medium">
          Empowering Academic Excellence
        </p>
      </motion.div>

      {/* Modern Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-12 flex flex-col items-center gap-2"
      >
        <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <span className="text-[11px] text-blue-200/80 font-medium">Loading your study portal...</span>
      </motion.div>
    </div>
  );
}
