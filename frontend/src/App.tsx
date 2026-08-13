import { useState, useEffect } from 'react';
import { Users, Calendar, Stethoscope, FileText, Pill, CreditCard, BarChart3, UserPlus, ClipboardList, Activity, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StatsCard } from './components/widgets/StatsCard';
import { PatientList } from './components/modules/patients/PatientList';
import { AppointmentList } from './components/modules/appointmentList/AppointmentList';
import { DoctorList } from './components/modules/doctors/DoctorList';
import { DoctorSchedule } from './components/modules/doctors/DoctorSchedule';
import { OPCaseSheet } from './components/modules/emr/OPCaseSheet';
import { InventoryList } from './components/modules/pharmacy/InventoryList';
import { OPDBilling } from './components/modules/billing/OPDBilling';
import { MISReports } from './components/modules/reports/MISReports';
import { DoctorPerformanceAnalytics } from './components/modules/analytics/DoctorPerformanceAnalytics';
import { IcdManagement } from './components/modules/icd/IcdManagement';
import { ClinicUserManagement } from './components/modules/admin/ClinicUserManagement';
import { SupportArticleManagement } from './components/modules/admin/SupportArticleManagement';
import { AuditLogs } from './components/modules/admin/AuditLogs';
import { NoAccessPage } from './components/modules/NoAccessPage';
import { Login } from './components/auth/Login';
import Settings from './components/modules/settings/Settings';
import { ITSupportAssistant } from './components/common/ITSupportAssistant';
import { PageSkeleton } from './components/ui/LoadingSkeleton';
import { ApiClient } from './utils/api';
import { hasFeatureAccess } from './utils/permissions';
import { Toaster } from 'sonner';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const normalizeStringArray = (items?: any): string[] => {
  if (typeof items === 'string') {
    return [items.trim().toLowerCase()].filter(Boolean);
  }

  return Array.isArray(items)
    ? items
        .filter((item) => item !== undefined && item !== null)
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
    : [];
};

const getDoctorIdentityMatch = (doctor: any, currentUser: any) => {
  const doctorId = String(doctor?._id ?? doctor?.id ?? '');
  const userId = String(currentUser?.id ?? currentUser?._id ?? '');
  return doctorId && userId && doctorId === userId;
};

const moduleFeatureRequirements: Record<string, string[]> = {
  patients: ['patients.view'],
  appointments: ['appointments.view'],
  doctors: ['doctors.view'],
  emr: ['emr.view'],
  pharmacy: ['pharmacy.view'],
  billing: ['billing.view'],
  icd: ['icd.view'],
  reports: ['reports.view'],
  analytics: ['reports.view'],
  admin: ['users.view'],
  'clinic-users': ['users.view'],
  'audit-logs': ['audit.view'],
  settings: [],
  dashboard: [],
};

const roleModuleAccess: Record<string, string[]> = {
  admin: ['dashboard', 'patients', 'appointments', 'doctors', 'emr', 'pharmacy', 'billing', 'icd', 'reports', 'analytics', 'clinic-users', 'audit-logs', 'settings'],
  doctor: ['dashboard', 'patients', 'appointments', 'doctors', 'emr', 'icd', 'analytics', 'settings'],
  nurse: ['dashboard', 'patients', 'appointments', 'emr', 'icd', 'reports', 'settings'],
  receptionist: ['dashboard', 'patients', 'appointments', 'doctors', 'pharmacy', 'billing', 'icd', 'reports', 'settings'],
  staff: ['dashboard', 'patients', 'appointments', 'emr', 'icd', 'reports', 'settings'],
};

const hasRoleModuleAccess = (moduleId: string, role: string) => {
  if (!role) return false;
  const allowed = roleModuleAccess[role] || [];
  return allowed.includes(moduleId);
};

const getModuleAccessState = (
  moduleId: string,
  role: string,
  permissions: string[],
  features: string[]
) => {
  if (role === 'admin') {
    return { visible: true, enabled: true };
  }

  if (moduleId === 'dashboard' || moduleId === 'settings') {
    return { visible: true, enabled: true };
  }

  const requiredPerms = moduleFeatureRequirements[moduleId] || [];
  const hasAccess = hasRoleModuleAccess(moduleId, role) || (
    requiredPerms.length > 0 && hasFeatureAccess(requiredPerms, permissions, features)
  );

  return {
    visible: hasAccess,
    enabled: hasAccess,
  };
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbConnectionError, setDbConnectionError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (window.localStorage.getItem('app_theme') === 'dark' ? 'dark' : 'light');
  });
  const [statsState, setStatsState] = useState({
    patientsCount: 0,
    appointmentsCount: 0,
    doctorsCount: 0,
    revenueToday: 0,
  });
  const [alertSummary, setAlertSummary] = useState({
    overdueFollowUps: 0,
    followUpsDueSoon: 0,
    highRiskPatients: 0,
  });
  const [doctorAvailability, setDoctorAvailability] = useState<string[]>([]);

  const formatScheduleItem = (slot: string) => {
    const rangeMatch = slot.match(/^(\d{2}\/\d{2}\/\d{4}) to (\d{2}\/\d{2}\/\d{4}) (\d{1,2}:\d{2} (?:AM|PM)) - (\d{1,2}:\d{2} (?:AM|PM))$/i);
    if (rangeMatch) {
      return `${rangeMatch[1]} → ${rangeMatch[2]} • ${rangeMatch[3]} to ${rangeMatch[4]}`;
    }
    const isoMatch = slot.match(/^(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (isoMatch) {
      return `${isoMatch[1]} • ${isoMatch[2]} - ${isoMatch[3]}`;
    }
    return slot;
  };

  useEffect(() => {
    checkSystemHealth();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle('dark', theme === 'dark');
    body.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<{ theme?: 'light' | 'dark' }>).detail?.theme;
      if (nextTheme && nextTheme !== theme) {
        setTheme(nextTheme);
      }
    };

    window.addEventListener('app-theme-change', onThemeChange as EventListener);
    return () => window.removeEventListener('app-theme-change', onThemeChange as EventListener);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme: nextTheme } }));
  };

  // Global handler: when backend reports invalid/expired token, stop polling and force logout
  useEffect(() => {
    const onAuthInvalid = () => {
      setIsAuthenticated(false);
      setLoading(false);
    };
    window.addEventListener('auth:invalid', onAuthInvalid as EventListener);
    return () => window.removeEventListener('auth:invalid', onAuthInvalid as EventListener);
  }, []);

  const checkSystemHealth = async () => {
    try {
      // Check API reachability + basic health
      const healthResponse = await fetch(`${API_URL}/health`);
      if (!healthResponse.ok) {
        throw new Error(`Health check returned ${healthResponse.status}`);
      }

      const health = await healthResponse.json();
      // The backend health check may not explicitly expose database status in all builds
      if (health.database && health.database !== 'connected') {
        setDbConnectionError(true);
        setLoading(false);
        return;
      }

      // Check authentication (sessionStorage is per-tab, localStorage is legacy fallback)
      const token = sessionStorage.getItem('hospital_access_token') ||
        sessionStorage.getItem('token') ||
        localStorage.getItem('hospital_access_token') ||
        localStorage.getItem('token');
      if (token) {
        ApiClient.getSession()
          .then(() => {
            setIsAuthenticated(true);
          })
          .catch(() => {
            ApiClient.logout();
            setIsAuthenticated(false);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('System health check failed:', {
        apiBaseUrl: API_URL,
        location: window.location.href,
        error,
      });
      setDbConnectionError(true);
      setLoading(false);
    }
  };

  const loadDoctorAvailability = async () => {
    try {
      const currentUser = ApiClient.getCurrentUser();
      if (!currentUser || currentUser.role !== 'doctor') {
        setDoctorAvailability([]);
        return;
      }

      const response = await ApiClient.getDoctors();
      if (response?.success && Array.isArray(response.doctors) && response.doctors.length > 0) {
        const currentDoctor = response.doctors.find((doc: any) => getDoctorIdentityMatch(doc, currentUser));
        const schedule = currentDoctor?.availabilitySchedule;
        setDoctorAvailability(Array.isArray(schedule) ? schedule : []);
      } else {
        setDoctorAvailability([]);
      }
    } catch (err) {
      console.error('Failed to load doctor availability:', err);
      setDoctorAvailability([]);
    }
  };

  // Fetch realtime metrics and poll every 5 seconds while authenticated
  useEffect(() => {
    let timer: any;
    const fetchMetrics = async () => {
      try {
        const currentUser = ApiClient.getCurrentUser();
        const permissions = normalizeStringArray(currentUser?.permissions || []);
        const features = normalizeStringArray(currentUser?.features || []);

        const canReadPatients = hasFeatureAccess(['patients.view'], permissions, features);
        const canReadAppointments = hasFeatureAccess(['appointments.view'], permissions, features);
        const canReadDoctors = hasFeatureAccess(['doctors.view'], permissions, features);
        const canReadBills = hasFeatureAccess(['billing.view'], permissions, features);

        const pPromise = canReadPatients
          ? ApiClient.getPatients().catch(() => ({ patients: [] }))
          : Promise.resolve({ patients: [] });
        const aPromise = canReadAppointments
          ? ApiClient.getAppointments().catch(() => ({ appointments: [] }))
          : Promise.resolve({ appointments: [] });
        const dPromise = canReadDoctors
          ? ApiClient.getDoctors().catch(() => ({ doctors: [] }))
          : Promise.resolve({ doctors: [] });
        const bPromise = canReadBills
          ? ApiClient.getBills().catch(() => ({ bills: [] }))
          : Promise.resolve({ bills: [] });
        const alertsPromise = ApiClient.get('/alerts/summary').catch(() => ({ summary: {} }));

        const [pRes, aRes, dRes, bRes, alertsRes] = await Promise.all([pPromise, aPromise, dPromise, bPromise, alertsPromise]);

        const patientsCount = pRes?.patients?.length ?? (Array.isArray(pRes) ? pRes.length : 0);
        const appointmentsCount = aRes?.appointments?.length ?? (Array.isArray(aRes) ? aRes.length : 0);
        const doctorsCount = dRes?.doctors?.length ?? (Array.isArray(dRes) ? dRes.length : 0);

        // Sum today's revenue if bills include amount and createdAt
        let revenueToday = 0;
        const bills = bRes?.bills ?? [];
        const today = new Date();
        const isSameDay = (d1: string|number|Date, d2: Date) => {
          const dd = new Date(d1);
          return dd.getFullYear() === d2.getFullYear() && dd.getMonth() === d2.getMonth() && dd.getDate() === d2.getDate();
        };
        for (const bill of bills) {
          const amount = Number(bill?.amount ?? bill?.total ?? 0) || 0;
          const created = bill?.createdAt ?? bill?.date ?? bill?.created;
          if (!created || isSameDay(created, today)) {
            revenueToday += amount;
          }
        }

        setStatsState({ patientsCount, appointmentsCount, doctorsCount, revenueToday });
        setAlertSummary({
          overdueFollowUps: Number(alertsRes?.summary?.overdueFollowUps ?? 0),
          followUpsDueSoon: Number(alertsRes?.summary?.followUpsDueSoon ?? 0),
          highRiskPatients: Number(alertsRes?.summary?.highRiskPatients ?? 0),
        });
      } catch (err) {
        console.error('Error fetching metrics:', err);
      }
    };

    if (isAuthenticated) {
      fetchMetrics();
      loadDoctorAvailability();
      timer = setInterval(fetchMetrics, 5000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  
  if (!isAuthenticated) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  const currentUser = ApiClient.getCurrentUser();
  const role = currentUser?.role || '';
  const currentPermissions = normalizeStringArray(currentUser?.permissions || []);
  const currentFeatures = normalizeStringArray(currentUser?.features || []);

  const canReadPatients = hasFeatureAccess(['patients.view'], currentPermissions, currentFeatures);
  const canReadAppointments = hasFeatureAccess(['appointments.view'], currentPermissions, currentFeatures);
  const canReadDoctors = hasFeatureAccess(['doctors.view'], currentPermissions, currentFeatures);
  const canReadBills = hasFeatureAccess(['billing.view'], currentPermissions, currentFeatures);
  const canReadEMR = hasFeatureAccess(['emr.view'], currentPermissions, currentFeatures);

  const stats = [
    ...(canReadPatients
      ? [{ title: 'Total Patients', value: statsState.patientsCount.toLocaleString(), icon: Users, change: '+0%', trend: 'up' as const }]
      : []),
    ...(canReadAppointments
      ? [{ title: "Today's Appointments", value: statsState.appointmentsCount.toLocaleString(), icon: Calendar, change: '+0%', trend: 'up' as const }]
      : []),
    ...(canReadDoctors
      ? [{ title: 'Active Doctors', value: statsState.doctorsCount.toLocaleString(), icon: Stethoscope, change: '+0%', trend: 'up' as const }]
      : []),
    ...(canReadBills
      ? [{ title: 'Revenue Today', value: `₹${statsState.revenueToday.toLocaleString()}`, icon: CreditCard, change: '+0%', trend: 'up' as const }]
      : []),
  ];

  const modules = [
    { id: 'patients', title: 'Patient Management', icon: Users, color: 'bg-blue-500', component: PatientList },
    { id: 'appointments', title: 'Appointments', icon: Calendar, color: 'bg-green-500', component: AppointmentList },
    {
      id: 'doctors',
      title: role === 'doctor' ? 'My Schedule' : ['admin', 'receptionist'].includes(role) ? 'Schedule Availability' : 'Doctor Management',
      icon: Stethoscope,
      color: 'bg-purple-500',
      component: ['admin', 'receptionist', 'doctor'].includes(role) ? DoctorSchedule : DoctorList,
    },
    { id: 'emr', title: 'EMR / Case Sheets', icon: FileText, color: 'bg-orange-500', component: OPCaseSheet },
    { id: 'pharmacy', title: 'Pharmacy & Inventory', icon: Pill, color: 'bg-pink-500', component: InventoryList },
    { id: 'billing', title: 'Billing & Payments', icon: CreditCard, color: 'bg-yellow-500', component: OPDBilling },
    { id: 'icd', title: 'ICD Management', icon: FileText, color: 'bg-teal-500', component: IcdManagement },
    { id: 'reports', title: 'Reports & Analytics', icon: BarChart3, color: 'bg-indigo-500', component: MISReports },
    { id: 'analytics', title: 'Doctor Analytics', icon: TrendingUp, color: 'bg-sky-500', component: DoctorPerformanceAnalytics },
    ...(role === 'admin'
      ? [
          { id: 'clinic-users', title: 'User Management', icon: UserPlus, color: 'bg-red-500', component: ClinicUserManagement },
          { id: 'audit-logs', title: 'Audit Trail', icon: Activity, color: 'bg-slate-500', component: AuditLogs },
          { id: 'support-articles', title: 'Support Articles', icon: FileText, color: 'bg-cyan-600', component: SupportArticleManagement },
        ]
      : []),
    { id: 'settings', title: 'Settings', icon: SettingsIcon, color: 'bg-gray-500', component: Settings },
  ];

  const moduleAccessState = Object.fromEntries(
    modules.map((module) => [
      module.id,
      getModuleAccessState(module.id, role, currentPermissions, currentFeatures),
    ])
  );

  const visibleModules = modules.filter((module) => moduleAccessState[module.id]?.visible);
  const enabledModules = visibleModules.filter((module) => moduleAccessState[module.id]?.enabled);

  const effectiveModule = enabledModules.some((module) => module.id === activeModule)
    ? activeModule
    : 'dashboard';

  const dashboardModules = visibleModules.filter((module) => module.id !== 'settings');

  const renderContent = () => {
    if (effectiveModule === 'dashboard') {
      if (visibleModules.length === 0) return <NoAccessPage />;
      return (
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
          </div>

          {role === 'doctor' && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold mb-3">My Availability</h3>
              {doctorAvailability.length === 0 ? (
                <p className="text-sm text-gray-500">No availability schedule found. Ask admin/receptionist to set your schedule.</p>
              ) : (
                <ul className="space-y-2">
                  {doctorAvailability.map((slot) => (
                    <li key={slot} className="text-sm text-gray-700">
                      {formatScheduleItem(slot)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Overdue Follow-ups</p>
              <h3 className="text-2xl font-semibold text-gray-900 mt-2">{alertSummary.overdueFollowUps}</h3>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Follow-ups Due Soon</p>
              <h3 className="text-2xl font-semibold text-gray-900 mt-2">{alertSummary.followUpsDueSoon}</h3>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <p className="text-sm text-gray-500">High-risk Patients</p>
              <h3 className="text-2xl font-semibold text-gray-900 mt-2">{alertSummary.highRiskPatients}</h3>
            </div>
          </div>

          <ITSupportAssistant
            role={role}
            permissions={currentPermissions}
            features={currentFeatures}
            currentModule={activeModule}
            userName={currentUser?.name || 'there'}
          />

          {/* Modules Grid */}
          <div>
            <h2 className="mb-6">All Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dashboardModules.map((module) => {
                const accessState = moduleAccessState[module.id] || { visible: true, enabled: false };
                const isEnabled = accessState.enabled;

                return (
                  <button
                    key={module.id}
                    onClick={() => isEnabled && setActiveModule(module.id)}
                    disabled={!isEnabled}
                    className={`rounded-lg p-6 shadow transition-all border text-left group ${
                      isEnabled
                        ? 'bg-white hover:shadow-lg border-gray-200 hover:border-gray-300'
                        : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isEnabled ? 'group-hover:scale-110' : ''} transition-transform`}>
                      <module.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-gray-900 mb-2">{module.title}</h3>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {isEnabled ? `Manage and view ${module.title.toLowerCase()}` : 'Access denied'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(() => {
              const commonActions = [
                {
                  title: 'Register New Patient',
                  description: 'Add a new patient to the system',
                  icon: UserPlus,
                  module: 'patients',
                  gradient: 'from-blue-500 to-blue-600',
                  buttonText: 'Add Patient',
                },
                {
                  title: 'Book Appointment',
                  description: 'Schedule a new appointment',
                  icon: ClipboardList,
                  module: 'appointments',
                  gradient: 'from-green-500 to-green-600',
                  buttonText: 'Book Now',
                },
                {
                  title: 'View Analytics',
                  description: 'Check hospital performance',
                  icon: Activity,
                  module: 'reports',
                  gradient: 'from-purple-500 to-purple-600',
                  buttonText: 'View Reports',
                },
                {
                  title: 'Open EMR',
                  description: 'View and manage patient records',
                  icon: FileText,
                  module: 'emr',
                  gradient: 'from-orange-500 to-orange-600',
                  buttonText: 'Open EMR',
                },
                {
                  title: 'Manage Doctors',
                  description: 'Update doctor availability and schedule',
                  icon: Stethoscope,
                  module: 'doctors',
                  gradient: 'from-purple-500 to-purple-600',
                  buttonText: 'View Schedule',
                },
                {
                  title: 'Process Billing',
                  description: 'Create and manage billing records',
                  icon: CreditCard,
                  module: 'billing',
                  gradient: 'from-yellow-500 to-yellow-600',
                  buttonText: 'Go to Billing',
                },
              ];

              const actionsByRole: Record<string, typeof commonActions> = {
                doctor: [
                  commonActions.find((a) => a.module === 'doctors')!, // Schedule
                  commonActions.find((a) => a.module === 'appointments')!,
                  commonActions.find((a) => a.module === 'emr')!,
                ],
                nurse: [
                  commonActions.find((a) => a.module === 'patients')!,
                  commonActions.find((a) => a.module === 'appointments')!,
                  commonActions.find((a) => a.module === 'emr')!,
                ],
                receptionist: [
                  commonActions.find((a) => a.module === 'patients')!,
                  commonActions.find((a) => a.module === 'appointments')!,
                  commonActions.find((a) => a.module === 'billing')!,
                ],
                staff: [
                  commonActions.find((a) => a.module === 'patients')!,
                  commonActions.find((a) => a.module === 'appointments')!,
                  commonActions.find((a) => a.module === 'doctors')!,
                ],
              };

              const actions = actionsByRole[role] || [
                commonActions.find((a) => a.module === 'patients')!,
                commonActions.find((a) => a.module === 'appointments')!,
                commonActions.find((a) => a.module === 'reports')!,
              ];

              const visibleActionModules = visibleModules.map((module) => module.id);
              return actions
                .filter((action) => visibleActionModules.includes(action.module))
                .map((action) => (
                  <div
                    key={action.module}
                    className={`bg-linear-to-br ${action.gradient} rounded-lg p-6 text-white`}
                  >
                    <action.icon className="w-8 h-8 mb-3" />
                    <h3 className="mb-2">{action.title}</h3>
                    <p className="text-white/90 text-sm mb-4">{action.description}</p>
                    <button
                      onClick={() => setActiveModule(action.module)}
                      className={`bg-white text-gray-900 px-4 py-2 rounded-lg text-sm hover:bg-white/90 transition-colors`}
                    >
                      {action.buttonText}
                    </button>
                  </div>
                ));
            })()}
          </div>
        </div>
      );
    }

    const activeModuleConfig = modules.find(m => m.id === effectiveModule);
    if (activeModuleConfig) {
      const ModuleComponent = activeModuleConfig.component;
      return <ModuleComponent onBack={() => setActiveModule('dashboard')} />;
    }

    return null;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-right" richColors />
      <Sidebar 
        isOpen={sidebarOpen} 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          theme={theme}
          onThemeToggle={toggleTheme}
        />
        
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}