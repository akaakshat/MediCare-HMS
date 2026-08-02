import { useContext } from 'react';
import { Home, Users, Calendar, Stethoscope, FileText, Pill, CreditCard, BarChart3, TrendingUp, Settings, LogOut, Shield, Activity } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { hasFeatureAccess } from '../../utils/permissions';

interface SidebarProps {
  isOpen: boolean;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

// Map features to their required permissions
const featurePermissions: { [key: string]: string[] } = {
  dashboard: [], // Always available
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
    ? userFeatures.map(f => String(f).trim().toLowerCase())
    : [];

  // Base menu items
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

  // Only show menu items that user has access to (feature-based)
  const menuAccess = allMenuItems.map((item) => {
    // Admin has access to everything
    if (isAdmin) {
      return { ...item, visible: true, enabled: true };
    }

    // Dashboard is always visible and enabled for authenticated users
    if (item.id === 'dashboard') {
      return { ...item, visible: true, enabled: true };
    }

    // Doctor performance analytics is restricted to admins and doctors only.
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
        isOpen ? 'w-64' : 'w-0'
      } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col`}
    >
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-gray-900">MediCare HMS</h1>
            <p className="text-xs text-gray-500">Hospital Management</p>
          </div>
        </div>
      </div>

      {!hasAnyAccess ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Shield className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">No access permissions</p>
          <p className="text-gray-400 text-xs mt-2">Contact your administrator to grant access</p>
        </div>
      ) : (
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => item.enabled && onModuleChange(item.id)}
              disabled={!item.enabled}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeModule === item.id
                  ? 'bg-blue-50 text-blue-600'
                  : item.enabled
                    ? 'text-gray-600 hover:bg-gray-50'
                    : 'text-gray-400 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
            </button>
          ))}
        </nav>
      )}

      <div className="p-4 border-t border-gray-200 space-y-1">
        <button
          onClick={() => onModuleChange('settings')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
