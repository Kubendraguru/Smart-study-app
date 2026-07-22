import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/onboarding'), 2200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-blue-900/30 mb-6"
      >
        <GraduationCap size={52} className="text-blue-600" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-white mb-1">Anna University</h1>
        <p className="text-blue-100 text-sm font-medium tracking-wide">Study Hub</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-12"
      >
        <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </motion.div>
    </div>
  );
}
