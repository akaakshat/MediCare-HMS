import React, { useEffect, useRef, useState } from 'react';
import { Menu, Bell, Search, User, LogOut, Sun, Moon, ShieldCheck } from 'lucide-react';
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
    <header className="border-b border-slate-200/70 bg-white/70 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="rounded-2xl border border-slate-200 bg-white/80 p-2.5 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Premium care workspace
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{getModuleTitle()}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onThemeToggle}
            className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          <div className="relative" ref={searchRef}>
            <div className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur w-[360px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients, appointments, doctors, invoices..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setShowSearchResults(true);
                }}
                className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>

            {showSearchResults && (
              <div className="absolute left-0 top-full mt-2 w-[360px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white/90 shadow-2xl shadow-slate-200/70 z-50 max-h-96 overflow-auto backdrop-blur-xl">
                <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Global Search
                </div>

                {isSearching ? (
                  <div className="p-4 text-sm text-slate-500">Searching across records...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">
                    {searchQuery.trim() ? `No matches found for “${searchQuery.trim()}”` : 'Type to search patients, appointments, doctors, or invoices.'}
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.module}-${result.id}`}
                        onMouseDown={() => handleResultSelect(result.module)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                      >
                        <div className="text-sm font-medium text-slate-900">{result.title}</div>
                        <div className="text-xs text-slate-500">{result.subtitle}</div>
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
                  setNotifications([
                    { id: '1', title: 'Welcome', message: 'Welcome back to the system', time: 'now' },
                  ]);
                }
              }}
              className="relative rounded-2xl border border-slate-200 bg-white/80 p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50"
              aria-haspopup="true"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white/90 shadow-2xl shadow-slate-200/70 z-50 backdrop-blur-xl">
                <div className="border-b border-slate-100 p-3 text-sm font-semibold text-slate-700">Notifications</div>
                <div className="max-h-60 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="border-b border-slate-100 p-3 last:border-b-0 hover:bg-slate-50">
                        <div className="text-sm font-medium text-slate-800">{n.title}</div>
                        <div className="text-xs text-slate-500">{n.message}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{n.time}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm pl-4">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-slate-900">{currentUser?.name || 'User'}</p>
              <p className="text-xs capitalize text-slate-500">{currentUser?.role || 'Staff'}</p>
            </div>
            <div
              ref={profileRef}
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
              className="relative flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600">
                <User className="h-5 w-5 text-white" />
              </div>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white/90 shadow-2xl shadow-slate-200/70 z-50 backdrop-blur-xl">
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{currentUser?.name || 'User'}</div>
                        <div className="text-xs text-slate-500">{currentUser?.email || ''}</div>
                        <div className="text-xs capitalize text-slate-400">{currentUser?.role || 'staff'}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        onClick={() => {
                          window.location.href = '/profile';
                        }}
                        className="w-full text-left rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}