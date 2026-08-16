import { useContext } from 'react';
import { Home, Users, Calendar, Stethoscope, FileText, Pill, CreditCard, BarChart3, TrendingUp, Settings, LogOut, Shield, Activity, Sparkles } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { hasFeatureAccess } from '../../utils/permissions';

interface SidebarProps {
  isOpen: boolean;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const featurePermissions: { [key: string]: string[] } = {
  dashboard: [],
  patients: ['patients.view'],
  appointments: ['appointments.view'],
  doctors: ['doctors.view'],
  emr: ['emr.view'],
  pharmacy: ['pharmacy.view'],
  billing: ['billing.view'],
  icd: ['icd.view'],
  reports: ['reports.view'],
  analytics: ['reports.view'],
  'audit-logs': ['audit.view'],
  admin: ['users.view'],
  'clinic-users': ['users.view'],
};

const roleModuleAccess: Record<string, string[]> = {
  admin: ['dashboard', 'patients', 'appointments', 'doctors', 'emr', 'pharmacy', 'billing', 'icd', 'reports', 'admin', 'clinic-users', 'settings'],
  doctor: ['dashboard', 'patients', 'appointments', 'doctors', 'emr', 'icd', 'analytics', 'settings'],
  nurse: ['dashboard', 'patients', 'appointments', 'emr', 'icd', 'reports', 'settings'],
  receptionist: ['dashboard', 'patients', 'appointments', 'doctors', 'pharmacy', 'billing', 'icd', 'reports', 'settings'],
  staff: ['dashboard', 'patients', 'appointments', 'emr', 'icd', 'reports', 'settings'],
};

const hasRoleAccess = (moduleId: string, role?: string) => {
  if (!role) return false;
  const allowed = roleModuleAccess[role];
  return Array.isArray(allowed) ? allowed.includes(moduleId) : false;
};

export function Sidebar({ isOpen, activeModule, onModuleChange }: SidebarProps) {
  const { user } = useContext(AuthContext);
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const isAdmin = normalizedRole === 'admin';
  const userFeatures = user?.features || [];
  const normalizedFeatures = Array.isArray(userFeatures)
    ? userFeatures.map((f) => String(f).trim().toLowerCase())
    : [];

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    {
      id: 'doctors',
      label: normalizedRole === 'doctor'
        ? 'My Schedule'
        : ['admin', 'receptionist'].includes(normalizedRole)
          ? 'Schedule Availability'
          : 'Doctors',
      icon: Stethoscope,
    },
    { id: 'emr', label: 'EMR', icon: FileText },
    { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'icd', label: 'ICD Management', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'analytics', label: 'Doctor Analytics', icon: TrendingUp },
    ...(isAdmin ? [
      { id: 'clinic-users', label: 'User Management', icon: Users },
      { id: 'audit-logs', label: 'Audit Trail', icon: Activity },
    ] : []),
  ];

  const menuAccess = allMenuItems.map((item) => {
    if (isAdmin) {
      return { ...item, visible: true, enabled: true };
    }

    if (item.id === 'dashboard') {
      return { ...item, visible: true, enabled: true };
    }

    if (item.id === 'analytics') {
      const allowed = normalizedRole === 'doctor';
      return { ...item, visible: allowed, enabled: allowed };
    }

    const requiredPerms = featurePermissions[item.id] || [];
    const hasRoleModuleAccess = hasRoleAccess(item.id, normalizedRole);
    const hasFeature = hasRoleModuleAccess || normalizedFeatures.includes(item.id) || hasFeatureAccess(requiredPerms, user?.permissions || [], userFeatures);

    if (!hasFeature) {
      return { ...item, visible: false, enabled: false };
    }

    const enabled = hasRoleModuleAccess || hasFeatureAccess(requiredPerms, user?.permissions || [], userFeatures);
    return { ...item, visible: true, enabled };
  });

  const visibleMenu = menuAccess.filter((item) => item.visible);
  const hasAnyAccess = visibleMenu.length > 0;

  return (
    <aside
      className={`${
        isOpen ? 'w-72' : 'w-0'
      } bg-slate-950 text-slate-100 border-r border-slate-800/90 shadow-[10px_0_30px_rgba(2,6,23,0.18)] transition-all duration-300 overflow-hidden flex flex-col`}
    >
      <div className="border-b border-slate-800/80 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 shadow-lg shadow-blue-500/20">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold text-white">MediCare HMS</h1>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">AI clinic operations</p>
          </div>
        </div>
      </div>

      {!hasAnyAccess ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Shield className="w-12 h-12 text-slate-500 mb-4" />
          <p className="text-slate-200 text-sm">No access permissions</p>
          <p className="text-slate-400 text-xs mt-2">Contact your administrator to grant access</p>
        </div>
      ) : (
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => item.enabled && onModuleChange(item.id)}
              disabled={!item.enabled}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                activeModule === item.id
                  ? 'bg-blue-500/15 text-white ring-1 ring-inset ring-blue-400/30 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.08)]'
                  : item.enabled
                    ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    : 'cursor-not-allowed bg-slate-900/60 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <item.icon className={`h-4 w-4 shrink-0 ${activeModule === item.id ? 'text-blue-300' : 'text-slate-400'}`} />
                <span className="truncate text-sm font-medium">{item.label}</span>
              </span>
              {activeModule === item.id && <span className="h-2 w-2 rounded-full bg-blue-400" />}
            </button>
          ))}
        </nav>
      )}

      <div className="space-y-2 border-t border-slate-800/80 p-3">
        <button
          onClick={() => onModuleChange('settings')}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-white"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200">
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
