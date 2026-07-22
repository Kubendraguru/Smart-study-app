import { motion } from 'framer-motion';
import { FileText, Bookmark, Download, Share2 } from 'lucide-react';
import type { Pdf } from '@/types';
import IconButton from '@/components/ui/IconButton';

export default function PdfCard({ pdf, index = 0, onClick }: { pdf: Pdf; index?: number; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100 transition-all duration-300 hover:shadow-md hover:shadow-gray-200"
    >
      <div className="flex items-start gap-3">
        <button onClick={onClick} className="flex items-start gap-3 flex-1 min-w-0 text-left">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{pdf.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{pdf.size}</span>
              <span>·</span>
              <span>{pdf.pages} pages</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">By {pdf.uploadedBy}</p>
          </div>
        </button>
      </div>
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
        <IconButton variant={pdf.bookmarked ? 'active' : 'ghost'} className="flex-1 justify-center">
          <Bookmark size={16} className={pdf.bookmarked ? 'fill-blue-500' : ''} />
        </IconButton>
        <IconButton variant="ghost" className="flex-1 justify-center">
          <Download size={16} />
        </IconButton>
        <IconButton variant="ghost" className="flex-1 justify-center">
          <Share2 size={16} />
        </IconButton>
      </div>
    </motion.div>
  );
}
