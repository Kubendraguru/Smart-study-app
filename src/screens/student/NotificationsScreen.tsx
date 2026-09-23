import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import AnnouncementCard from '@/components/cards/AnnouncementCard';
import EmptyState from '@/components/ui/EmptyState';
import { getAnnouncements } from '@/service/announcements';
import type { Announcement } from '@/types';

export default function NotificationsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAnnouncements();
        setAnnouncements(data);
      } catch (err) {
        console.error('Error loading notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markAllRead = () => {
    setAnnouncements((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <>
      <AppHeader
        title="Notifications"
        showBack
        rightAction={
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <CheckCheck size={15} />
            Mark all
          </button>
        }
      />
      <PageContainer showBottomNav>
        <div className="pt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={28} />
            </div>
          ) : announcements.length > 0 ? (
            announcements.map((item, i) => (
              <AnnouncementCard key={item.id} announcement={item} index={i} />
            ))
          ) : (
            <EmptyState
              icon={Bell}
              title="No notifications"
              message="You're all caught up! Check back later for updates."
            />
          )}
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
