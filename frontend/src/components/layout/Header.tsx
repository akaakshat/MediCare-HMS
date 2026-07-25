import React, { useEffect, useRef, useState } from 'react';
import { Menu, Bell, Search, User, LogOut, Sun, Moon } from 'lucide-react';
import { ApiClient } from '../../utils/api';
import { toast } from 'sonner';

interface HeaderProps {
  onMenuClick: () => void;
  activeModule: string;
  onModuleChange?: (moduleId: string) => void;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
}

interface GlobalSearchResult {
  module: string;
  title: string;
  subtitle: string;
  id: string;
}

export function Header({ onMenuClick, activeModule, onModuleChange, theme = 'light', onThemeToggle }: HeaderProps) {
  const currentUser = ApiClient.getCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<number | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

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

  const performGlobalSearch = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const [patientsRes, appointmentsRes, doctorsRes, billsRes] = await Promise.all([
        ApiClient.getPatients({ page: 1, limit: 5, search: trimmed }).catch(() => ({ patients: [] } as { patients: any[] })),
        ApiClient.getAppointments({ page: 1, limit: 5, search: trimmed }).catch(() => ({ appointments: [] } as { appointments: any[] })),
        ApiClient.getDoctors().catch(() => ({ doctors: [] } as { doctors: any[] })),
        ApiClient.get('/billing').catch(() => ({ success: false, bills: [] } as { success: boolean; bills: any[] })),
      ]);

      const results: GlobalSearchResult[] = [];
      const patients = Array.isArray((patientsRes as any)?.patients) ? (patientsRes as any).patients : [];
      const appointments = Array.isArray((appointmentsRes as any)?.appointments) ? (appointmentsRes as any).appointments : [];
      const doctors = Array.isArray((doctorsRes as any)?.doctors) ? (doctorsRes as any).doctors : [];
      const bills = Array.isArray((billsRes as any)?.bills) ? (billsRes as any).bills : [];

      patients.slice(0, 3).forEach((patient: any) => {
        results.push({
          module: 'patients',
          title: patient.name || 'Unnamed patient',
          subtitle: `UHID ${patient.uhid || 'N/A'} • ${patient.phone || 'No phone'}`,
          id: patient._id || patient.uhid || `patient-${patient.name}`,
        });
      });

      appointments.slice(0, 3).forEach((appointment: any) => {
        const patientName = typeof appointment.patient === 'object' ? appointment.patient?.name : appointment.patient;
        const doctorName = typeof appointment.doctor === 'object' ? appointment.doctor?.name : appointment.doctor;
        results.push({
          module: 'appointments',
          title: appointment.appointmentId || appointment._id || 'Appointment',
          subtitle: `${patientName || 'Unknown patient'} • ${doctorName || 'Unknown doctor'} • ${appointment.status || 'Pending'}`,
          id: appointment._id || appointment.appointmentId || `appointment-${appointment.date}`,
        });
      });

      doctors.filter((doctor: any) => {
        const haystack = `${doctor.name || ''} ${doctor.specialization || ''}`.toLowerCase();
        return haystack.includes(trimmed.toLowerCase());
      }).slice(0, 3).forEach((doctor: any) => {
        results.push({
          module: 'doctors',
          title: doctor.name || 'Doctor',
          subtitle: doctor.specialization || 'Doctor profile',
          id: doctor._id || doctor.id || `doctor-${doctor.name}`,
        });
      });

      bills.filter((bill: any) => {
        const haystack = `${bill.invoiceId || ''} ${bill.patientName || ''} ${bill.uhid || ''}`.toLowerCase();
        return haystack.includes(trimmed.toLowerCase());
      }).slice(0, 3).forEach((bill: any) => {
        results.push({
          module: 'billing',
          title: bill.invoiceId || bill._id || 'Invoice',
          subtitle: `${bill.patientName || 'Unknown patient'} • ₹${Number(bill.amount || 0).toLocaleString()}`,
          id: bill._id || bill.invoiceId || `bill-${bill.amount}`,
        });
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Global search failed', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);

    searchTimer.current = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('global-search', { detail: { query: value } }));
      void performGlobalSearch(value);
    }, 300);
  };

  const handleResultSelect = (moduleId: string) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    onModuleChange?.(moduleId);
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
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearchResults(false);
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
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-gray-900">{getModuleTitle()}</h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onThemeToggle}
            className="hidden md:flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          <div className="relative" ref={searchRef}>
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 w-md dark:bg-slate-800">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search patients, appointments, doctors, invoices..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setShowSearchResults(true);
                }}
                className="bg-transparent border-none outline-none text-sm w-full"
              />
            </div>

            {showSearchResults && (
              <div className="absolute left-0 top-full mt-2 w-md max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-auto dark:border-slate-700 dark:bg-slate-900">
                <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:text-slate-400">
                  Global Search
                </div>

                {isSearching ? (
                  <div className="p-4 text-sm text-gray-500">Searching across records...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    {searchQuery.trim() ? `No matches found for “${searchQuery.trim()}”` : 'Type to search patients, appointments, doctors, or invoices.'}
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.module}-${result.id}`}
                        onMouseDown={() => handleResultSelect(result.module)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 dark:hover:bg-slate-800 dark:border-slate-700"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{result.title}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{result.subtitle}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
              aria-haspopup="true"
              title="Notifications"
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
              <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
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