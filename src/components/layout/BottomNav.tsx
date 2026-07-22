import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Bookmark, Bell, User } from 'lucide-react';

const navItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/home' },
  { id: 'bookmarks', label: 'Saved', icon: Bookmark, path: '/bookmarks' },
  { id: 'notifications', label: 'Alerts', icon: Bell, path: '/notifications' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 py-2 px-3 flex-1"
            >
              {isActive && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-blue-600"
                />
              )}
              <Icon
                size={22}
                className={isActive ? 'text-blue-600' : 'text-gray-400'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
