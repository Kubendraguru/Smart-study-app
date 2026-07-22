import { useState } from 'react';
import { Bookmark, FileText, Video } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import PdfCard from '@/components/cards/PdfCard';
import VideoCard from '@/components/cards/VideoCard';
import EmptyState from '@/components/ui/EmptyState';
import { subjects } from '@/data/subjects';

type Tab = 'pdfs' | 'videos';

export default function BookmarksScreen() {
  const [tab, setTab] = useState<Tab>('pdfs');

  const bookmarkedPdfs: { pdf: typeof subjects[0]['units'][0]['pdfs'][0]; subjectId: string }[] = [];
  const bookmarkedVideos: { video: typeof subjects[0]['units'][0]['videos'][0]; subjectId: string }[] = [];

  subjects.forEach((subject) => {
    subject.units.forEach((unit) => {
      unit.pdfs.forEach((pdf) => {
        if (pdf.bookmarked) bookmarkedPdfs.push({ pdf, subjectId: subject.id });
      });
      unit.videos.forEach((video) => {
        if (video.bookmarked) bookmarkedVideos.push({ video, subjectId: subject.id });
      });
    });
  });

  const hasBookmarks = bookmarkedPdfs.length > 0 || bookmarkedVideos.length > 0;

  return (
    <>
      <AppHeader title="Bookmarks" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          {hasBookmarks && (
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setTab('pdfs')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'pdfs' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'bg-gray-50 text-gray-500'}`}
              >
                <FileText size={15} />
                PDFs ({bookmarkedPdfs.length})
              </button>
              <button
                onClick={() => setTab('videos')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'videos' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'bg-gray-50 text-gray-500'}`}
              >
                <Video size={15} />
                Videos ({bookmarkedVideos.length})
              </button>
            </div>
          )}

          {!hasBookmarks && (
            <EmptyState
              icon={Bookmark}
              title="No bookmarks yet"
              message="Tap the bookmark icon on any PDF or video to save it here for quick access."
            />
          )}

          {hasBookmarks && tab === 'pdfs' && (
            <div className="space-y-3">
              {bookmarkedPdfs.length > 0 ? (
                bookmarkedPdfs.map(({ pdf }, i) => <PdfCard key={pdf.id} pdf={pdf} index={i} />)
              ) : (
                <EmptyState icon={FileText} title="No bookmarked PDFs" message="Bookmark PDFs to see them here." />
              )}
            </div>
          )}

          {hasBookmarks && tab === 'videos' && (
            <div className="grid grid-cols-2 gap-3">
              {bookmarkedVideos.length > 0 ? (
                bookmarkedVideos.map(({ video }, i) => <VideoCard key={video.id} video={video} index={i} />)
              ) : (
                <div className="col-span-2">
                  <EmptyState icon={Video} title="No bookmarked videos" message="Bookmark videos to see them here." />
                </div>
              )}
            </div>
          )}
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
