import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { onboardingSlides } from '@/data/onboarding';
import Button from '@/components/ui/Button';

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const slide = onboardingSlides[current];
  const Icon = slide.icon;
  const isLast = current === onboardingSlides.length - 1;

  const handleNext = () => {
    if (isLast) {
      navigate('/login');
    } else {
      setCurrent((prev) => prev + 1);
    }
  };

  const handleSkip = () => navigate('/login');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex justify-end p-4">
        {!isLast && (
          <button onClick={handleSkip} className="text-sm font-medium text-gray-400 hover:text-gray-600">
            Skip
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div className={`w-40 h-40 rounded-3xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-8 shadow-xl shadow-blue-600/20`}>
              <Icon size={72} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{slide.title}</h2>
            <p className="text-base text-gray-500 leading-relaxed max-w-xs">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="px-8 pb-10 space-y-6">
        <div className="flex justify-center gap-2">
          {onboardingSlides.map((_, i) => (
            <motion.div
              key={i}
              className="h-2 rounded-full"
              animate={{
                width: i === current ? 24 : 8,
                backgroundColor: i === current ? '#2563eb' : '#d1d5db',
              }}
            />
          ))}
        </div>
        <Button fullWidth size="lg" onClick={handleNext}>
          {isLast ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
