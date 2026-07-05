import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';

export const usePermissions = () => {
  const { user } = useContext(AuthContext);

  const permissions = useMemo(() => {
    const rawPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
    return rawPermissions.map((permission) => String(permission).trim().toLowerCase()).filter(Boolean);
  }, [user?.permissions]);

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

  return { permissions, hasPermission, hasAnyPermission, hasRole };
};
