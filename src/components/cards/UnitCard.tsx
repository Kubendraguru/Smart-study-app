import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, Video, Circle } from 'lucide-react';
import type { Unit } from '@/types';

export default function UnitCard({ unit, subjectId, index = 0 }: { unit: Unit; subjectId: string; index?: number }) {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/subject/${subjectId}/unit/${unit.id}`)}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100 transition-all duration-300 hover:shadow-md hover:shadow-gray-200 flex items-center gap-3"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${unit.completed ? 'bg-emerald-50' : 'bg-blue-50'}`}>
        {unit.completed ? (
          <CheckCircle2 size={20} className="text-emerald-600" />
        ) : (
          <Circle size={20} className="text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-blue-600">Unit {unit.number}</span>
        </div>
        <h3 className="font-semibold text-gray-900 text-sm truncate">{unit.title}</h3>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FileText size={12} />
            {unit.pdfs.length} PDFs
          </span>
          <span className="flex items-center gap-1">
            <Video size={12} />
            {unit.videos.length} Videos
          </span>
        </div>
      </div>
    </motion.button>
  );
}
