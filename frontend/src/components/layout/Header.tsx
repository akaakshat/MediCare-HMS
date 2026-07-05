import React, { useEffect, useRef, useState } from 'react';
import { Menu, Bell, Search, User, LogOut } from 'lucide-react';
import { ApiClient } from '../../utils/api';
import { toast } from 'sonner';

interface HeaderProps {
  onMenuClick: () => void;
  activeModule: string;
}

export function Header({ onMenuClick, activeModule }: HeaderProps) {
  const currentUser = ApiClient.getCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimer = useRef<number | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = () => {
    ApiClient.logout();
    toast.success('Logged out successfully');
    window.location.reload();
  };

  const getModuleTitle = () => {
    const titles: { [key: string]: string } = {
      dashboard: 'Dashboard',
      patients: 'Patient Management',
      appointments: 'Appointments',
      doctors: 'Doctor Management',
      emr: 'Electronic Medical Records',
      pharmacy: 'Pharmacy & Inventory',
      billing: 'Billing & Payments',
      reports: 'Reports & Analytics',
      settings: 'Settings',
    };
    return titles[activeModule] || 'Dashboard';
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener('mousedown', onDocClick);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-gray-900">{getModuleTitle()}</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 w-64">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                const v = e.target.value;
                setSearchQuery(v);
                if (searchTimer.current) window.clearTimeout(searchTimer.current);
                // debounce and dispatch a global search event
                searchTimer.current = window.setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('global-search', { detail: { query: v } }));
                }, 300) as unknown as number;
              }}
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>

          <div className="relative" ref={notifRef}>
            <button
              onClick={async () => {
                setNotifOpen((o) => !o);
                try {
                  const res: any = await ApiClient.get('/notifications').catch(() => null);
                  if (res && Array.isArray(res.notifications)) setNotifications(res.notifications);
                } catch (e) {
                  // ignore, we'll fallback to local
                }
                if (notifications.length === 0) {
                  // Provide a friendly fallback so the UI feels responsive
                  setNotifications([
                    { id: '1', title: 'Welcome', message: 'Welcome back to the system', time: 'now' },
                  ]);
                }
              }}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-expanded={notifOpen}
              aria-haspopup="true"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b">Notifications</div>
                <div className="max-h-60 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-gray-50 border-b last:border-b-0">
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-gray-500">{n.message}</div>
                        <div className="text-xs text-gray-400 mt-1">{n.time}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right hidden md:block">
              <p className="text-sm text-gray-900">{currentUser?.name || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{currentUser?.role || 'Staff'}</p>
            </div>
            <div
              ref={profileRef}
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
              className="relative flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{currentUser?.name || 'User'}</div>
                        <div className="text-xs text-gray-500">{currentUser?.email || ''}</div>
                        <div className="text-xs text-gray-400 capitalize">{currentUser?.role || 'staff'}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        onClick={() => {
                          // navigate to profile route if available
                          window.location.href = '/profile';
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded hover:bg-red-50 text-sm text-red-600"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}