import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { ApiClient } from '../utils/api';
import { normalizeStringArray, expandFeatureAccessToPermissions } from '../utils/permissions';

interface PermissionContextValue {
  permissions: string[];
  loading: boolean;
  hasPermission: (permission?: string | string[]) => boolean;
  hasAnyPermission: (permissionList: Array<string | string[]>) => boolean;
  hasRole: (role?: string | string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

export const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasRole: () => false,
  refreshPermissions: async () => {},
});

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPermissions = async () => {
    try {
      const result = await ApiClient.get('/rbac/permissions/me');
      const nextPermissions = Array.isArray(result?.permissions)
        ? expandFeatureAccessToPermissions(result.permissions)
        : [];
      setPermissions(nextPermissions);
    } catch (error) {
      console.error('Unable to refresh permissions', error);
      const fallback = Array.isArray(user?.permissions) ? user.permissions : [];
      setPermissions(expandFeatureAccessToPermissions(fallback));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const fallbackPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
    setPermissions(expandFeatureAccessToPermissions(fallbackPermissions));
    if (user) {
      void refreshPermissions();
    } else {
      setLoading(false);
    }
  }, [user]);

  const hasPermission = (permission?: string | string[]) => {
    if (!permission) return true;
    const requested = Array.isArray(permission) ? permission : [permission];
    return requested.some((item) => permissions.includes(String(item).trim().toLowerCase()));
  };

  const hasAnyPermission = (permissionList: Array<string | string[]>) => {
    if (!permissionList || permissionList.length === 0) return true;
    return permissionList.some((permission) => hasPermission(permission));
  };

  const hasRole = (role?: string | string[]) => {
    if (!role) return false;
    const requestedRoles = Array.isArray(role) ? role : [role];
    const normalizedUserRole = String(user?.role || '').trim().toLowerCase();
    return requestedRoles.some((item) => normalizedUserRole === String(item).trim().toLowerCase());
  };

  const value = useMemo(() => ({ permissions, loading, hasPermission, hasAnyPermission, hasRole, refreshPermissions }), [permissions, loading, user]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};
