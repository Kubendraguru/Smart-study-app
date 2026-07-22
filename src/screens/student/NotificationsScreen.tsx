import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import NotificationCard from '@/components/cards/NotificationCard';
import EmptyState from '@/components/ui/EmptyState';
import { notifications as initialNotifications } from '@/data/notifications';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
          {notifications.length > 0 ? (
            notifications.map((notification, i) => (
              <NotificationCard key={notification.id} notification={notification} index={i} />
            ))
          ) : (
            <EmptyState icon={Bell} title="No notifications" message="You're all caught up! Check back later for updates." />
          )}
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
