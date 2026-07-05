import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { PermissionContext } from '../../context/PermissionContext';
import { NoAccessPage } from '../modules/NoAccessPage';

interface ProtectedRouteProps {
  permission?: string | string[];
  permissions?: Array<string | string[]>;
  role?: string | string[];
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  permissions,
  role,
  children,
  redirectTo = '/login',
}) => {
  const { user } = useContext(AuthContext);
  const { hasPermission, hasAnyPermission, hasRole } = useContext(PermissionContext);

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  const allowByPermission = permission ? hasPermission(permission) : true;
  const allowByAny = permissions ? hasAnyPermission(permissions) : true;
  const allowByRole = role ? hasRole(role) : true;

  if (allowByPermission && allowByAny && allowByRole) {
    return <>{children}</>;
  }

  return <NoAccessPage userName={user.name} userRole={user.role} />;
};
