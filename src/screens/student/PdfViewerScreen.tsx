import { useParams } from 'react-router-dom';
import { FileText, Download, Share2, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import IconButton from '@/components/ui/IconButton';
import { subjects } from '@/data/subjects';

export default function PdfViewerScreen() {
  const { pdfId } = useParams();

  let pdf = null;
  let subjectName = '';
  for (const subject of subjects) {
    for (const unit of subject.units) {
      const found = unit.pdfs.find((p) => p.id === pdfId);
      if (found) {
        pdf = found;
        subjectName = subject.name;
        break;
      }
    }
    if (pdf) break;
  }

  if (!pdf) {
    return (
      <>
        <AppHeader title="PDF Viewer" showBack />
        <PageContainer>
          <div className="pt-20 text-center text-gray-500">PDF not found.</div>
        </PageContainer>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader
        title={pdf.title}
        showBack
        rightAction={
          <div className="flex items-center gap-1">
            <IconButton variant="ghost">
              <Bookmark size={18} className={pdf.bookmarked ? 'fill-blue-500 text-blue-500' : 'text-gray-500'} />
            </IconButton>
            <IconButton variant="ghost">
              <Share2 size={18} className="text-gray-500" />
            </IconButton>
            <IconButton variant="ghost">
              <Download size={18} className="text-gray-500" />
            </IconButton>
          </div>
        }
      />
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
          <FileText size={14} className="text-red-500" />
          <span>{subjectName}</span>
          <span>·</span>
          <span>{pdf.pages} pages</span>
          <span>·</span>
          <span>{pdf.size}</span>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm shadow-gray-200/60 border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-8 min-h-[400px]">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <FileText size={40} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{pdf.title}</h3>
              <p className="text-sm text-gray-500 mb-4">PDF preview placeholder</p>
              <p className="text-xs text-gray-400">Page 1 of {pdf.pages}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-white">
            <button className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 disabled:opacity-30">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-600">1 / {pdf.pages}</span>
            <button className="p-2 rounded-xl text-gray-600 hover:bg-gray-50">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <button className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white font-semibold rounded-2xl shadow-sm shadow-blue-600/30 hover:bg-blue-700 transition-colors">
          <Download size={18} />
          Download PDF
        </button>
      </div>
    </div>
  );
}
