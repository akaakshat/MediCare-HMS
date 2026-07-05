import React, { useContext } from 'react';
import { PermissionContext } from '../../context/PermissionContext';
import { NoAccessPage } from '../modules/NoAccessPage';

interface PermissionGateProps {
  permission?: string | string[];
  permissions?: Array<string | string[]>;
  role?: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  role,
  children,
  fallback,
}) => {
  const { hasPermission, hasAnyPermission, hasRole } = useContext(PermissionContext);

  const allowByPermission = permission ? hasPermission(permission) : true;
  const allowByAny = permissions ? hasAnyPermission(permissions) : true;
  const allowByRole = role ? hasRole(role) : true;

  if (allowByPermission && allowByAny && allowByRole) {
    return <>{children}</>;
  }

  return <>{fallback ?? <NoAccessPage />}</>;
};
