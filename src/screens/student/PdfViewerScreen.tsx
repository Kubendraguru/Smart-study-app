import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Loader2,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import IconButton from '@/components/ui/IconButton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { recordPdfView } from '@/service/tracking';
import { useArrearMotivation } from '@/hooks/useArrearMotivation';
import ArrearMotivationToast from '@/components/arrear/ArrearMotivationToast';
import { downloadPdf } from '@/utils/fileDownloader';
import type { Pdf } from '@/types';

export default function PdfViewerScreen() {
  const { pdfId } = useParams<{ pdfId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const statePdf = location.state?.pdf as Pdf | undefined;
  const stateSubjectName = location.state?.subjectName as string | undefined;
  const stateSubjectId = location.state?.subjectId as string | undefined;

  const [pdf, setPdf] = useState<Pdf | null>(statePdf ?? null);
  const [subjectName, setSubjectName] = useState<string>(stateSubjectName ?? '');
  const [subjectId, setSubjectId] = useState<string | undefined>(stateSubjectId);
  const [loading, setLoading] = useState<boolean>(!statePdf);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(statePdf?.bookmarked ?? false);
  const [viewRecorded, setViewRecorded] = useState<boolean>(false);

  // Arrear motivation while studying PDF
  const { isToastVisible, currentMessage, dismissToast } = useArrearMotivation({
    subjectId,
    isStudyActive: !loading && !loadError,
  });

  const handleTrackView = (targetPdfId?: string) => {
    const idToTrack = targetPdfId || pdf?.id || pdfId;
    if (!user || role === 'teacher' || !idToTrack || viewRecorded) return;
    setViewRecorded(true);
    recordPdfView(idToTrack, user.id);
  };

  useEffect(() => {
    if (!pdfId) {
      setLoading(false);
      return;
    }

    loadPdfDetails();
  }, [pdfId]);

  async function loadPdfDetails() {
    try {
      // 1. Check Supabase materials table first
      const { data: material, error: matError } = await supabase
        .from('materials')
        .select('*')
        .eq('id', pdfId)
        .maybeSingle();

      if (material && material.file_url) {
        let detectedSubjectName = stateSubjectName || 'Study Material';

        if (material.unit_id) {
          const { data: unitData } = await supabase
            .from('units')
            .select('unit_title, subject_id, subjects(id, subject_name)')
            .eq('id', material.unit_id)
            .maybeSingle();

          if (unitData) {
            const subj = (unitData as any).subjects;
            if (!stateSubjectName) {
              detectedSubjectName = subj?.subject_name || unitData.unit_title || 'Study Material';
            }
            if (!subjectId) {
              setSubjectId(unitData.subject_id || subj?.id);
            }
          }
        }

        setPdf({
          id: material.id,
          title: material.title || 'Document',
          size: 'PDF',
          pages: 1,
          uploadedBy: 'Instructor',
          uploadedAt: material.created_at,
          url: material.file_url,
          file_url: material.file_url,
          bookmarked: false,
        });
        setSubjectName(detectedSubjectName);
        setLoading(false);
        return;
      }

      // 2. Fallback to mock subjects data if not in database
      let foundMock: Pdf | null = null;
      let foundSubjectName = '';
      for (const subject of subjects) {
        for (const unit of subject.units) {
          const found = unit.pdfs.find((p) => p.id === pdfId);
          if (found) {
            foundMock = found;
            foundSubjectName = subject.name;
            break;
          }
        }
        if (foundMock) break;
      }

      if (foundMock) {
        setPdf(foundMock);
        setSubjectName(foundSubjectName);
        setIsBookmarked(Boolean(foundMock.bookmarked));
      } else if (!statePdf) {
        setPdf(null);
      }
    } catch (err) {
      console.error('Error loading PDF details:', err);
      if (!statePdf) setPdf(null);
    } finally {
      setLoading(false);
    }
  }

  const fileUrl = pdf?.file_url || pdf?.url;

  const handleDownload = async () => {
    if (!fileUrl || downloading) return;
    setDownloading(true);
    try {
      await downloadPdf(fileUrl, pdf?.title || 'study_material');
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!fileUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: pdf?.title,
          url: fileUrl,
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      navigator.clipboard?.writeText(fileUrl);
      alert('PDF link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader title="Loading PDF..." showBack />
        <PageContainer>
          <div className="pt-24 flex flex-col items-center justify-center text-center">
            <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-600">Retrieving study material...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!pdf || !fileUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader title="PDF Viewer" showBack />
        <PageContainer>
          <div className="pt-20 text-center max-w-sm mx-auto px-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base mb-1">PDF not found</h3>
            <p className="text-sm text-gray-500 mb-6">
              The requested material could not be found or has an invalid URL.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </PageContainer>
      </div>
    );
  }

  const handleAskAi = () => {
    if (!pdf) return;
    navigate('/ai-assistant', {
      state: {
        attachedPdf: {
          id: pdf.id,
          title: pdf.title,
          fileUrl,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader
        title={pdf.title}
        showBack
        rightAction={
          <div className="flex items-center gap-1">
            <IconButton
              variant="ghost"
              onClick={handleAskAi}
              title="Ask AI Assistant about this PDF"
              className="text-blue-600 hover:bg-blue-50"
            >
              <Sparkles size={18} className="text-blue-600" />
            </IconButton>
            <IconButton
              variant={isBookmarked ? 'active' : 'ghost'}
              onClick={() => setIsBookmarked((prev) => !prev)}
              title="Bookmark"
            >
              <Bookmark size={18} className={isBookmarked ? 'fill-blue-500 text-blue-500' : 'text-gray-500'} />
            </IconButton>
            <IconButton variant="ghost" onClick={handleShare} title="Share PDF">
              <Share2 size={18} className="text-gray-500" />
            </IconButton>
            <IconButton
              variant="ghost"
              onClick={handleDownload}
              disabled={downloading}
              title="Download PDF"
            >
              {downloading ? (
                <Loader2 size={18} className="animate-spin text-blue-600" />
              ) : (
                <Download size={18} className="text-gray-500" />
              )}
            </IconButton>
          </div>
        }
      />

      <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col">
        {/* Info header */}
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
          <FileText size={14} className="text-red-500 flex-shrink-0" />
          <span className="truncate max-w-[160px]">{subjectName || 'Study Material'}</span>
          <span>·</span>
          <span>{pdf.pages ? `${pdf.pages} pages` : 'Document'}</span>
          <span>·</span>
          <span>{pdf.size || 'PDF'}</span>
        </div>

        {/* PDF viewer frame */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm shadow-gray-200/60 border border-gray-100 overflow-hidden flex flex-col min-h-[480px] relative">
          {loadingPdf && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center z-10">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-gray-500 font-medium">Loading PDF document...</p>
            </div>
          )}

          {loadError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
                <AlertCircle size={28} className="text-amber-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Preview Unavailable Inline</h4>
              <p className="text-xs text-gray-500 mb-4 max-w-xs">
                Your browser cannot display this PDF inline. You can open it directly in a new tab or download it.
              </p>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Download size={14} />
                Download PDF File
              </button>
            </div>
          ) : (
            <iframe
              key={`${fileUrl}-${page}-${zoom}`}
              src={`${fileUrl}#page=${page}&zoom=${zoom}`}
              title={pdf.title}
              className="w-full flex-1 min-h-[420px] border-0"
              onLoad={() => {
                setLoadingPdf(false);
                handleTrackView();
              }}
              onError={() => {
                setLoadingPdf(false);
                setLoadError(true);
              }}
            />
          )}

          {/* Controls Bar */}
          <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-white">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
                disabled={zoom <= 50}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-semibold text-gray-600 min-w-[3rem] text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
                disabled={zoom >= 200}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium text-gray-600 px-1">
                Page {page}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                title="Next Page"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white font-semibold rounded-2xl shadow-sm shadow-blue-600/30 hover:bg-blue-700 transition-colors disabled:opacity-75"
        >
          {downloading ? (
            <Loader2 size={18} className="animate-spin text-white" />
          ) : (
            <Download size={18} />
          )}
          <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
        </button>
      </div>

      <ArrearMotivationToast
        visible={isToastVisible}
        message={currentMessage}
        onDismiss={dismissToast}
        position="bottom"
      />
    </div>
  );
}


