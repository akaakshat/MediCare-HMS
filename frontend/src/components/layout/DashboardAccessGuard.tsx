// frontend/src/components/layout/DashboardAccessGuard.tsx
// Component to check user feature access and show appropriate content

import React, { useEffect, useState } from 'react';
import { NoAccessPage } from '../modules/NoAccessPage';
import { ApiClient } from '../../utils/api';

interface DashboardAccessGuardProps {
  children: React.ReactNode;
  requiredFeatures?: string[];
  fallback?: React.ReactNode;
}

export const DashboardAccessGuard: React.FC<DashboardAccessGuardProps> = ({
  children,
  requiredFeatures = [],
  fallback
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  const normalizeStringArray = (items?: any[]): string[] =>
    Array.isArray(items)
      ? items
          .filter((item) => item !== undefined && item !== null)
          .map((item) => String(item).trim().toLowerCase())
          .filter(Boolean)
      : [];

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);

// Fetch current user session with fresh permissions using ApiClient.
        const response = await ApiClient.get('/auth/session');
        
        if (response?.success && response?.user) {
          const user = response.user;
          const userPermissions = normalizeStringArray(user.permissions);
          const userFeatures = normalizeStringArray(user.features);
          const userRole = (user.role || 'unknown').toLowerCase();

          setUserInfo(user);

          if (requiredFeatures.length > 0) {
            const normalizedRequired = normalizeStringArray(requiredFeatures);
            const hasAllFeatures = normalizedRequired.every(feature =>
              userPermissions.includes(feature) || userFeatures.includes(feature)
            );
            setHasAccess(hasAllFeatures);
          } else {
            const isKnownRole = ['admin', 'doctor', 'nurse', 'receptionist', 'staff'].includes(userRole);
            const hasAnyPermission = isKnownRole || userPermissions.length > 0 || userFeatures.length > 0;
            setHasAccess(hasAnyPermission);
          }
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking feature access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [requiredFeatures]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show fallback or NoAccessPage if no access
  if (!hasAccess) {
    return fallback || (
      <NoAccessPage
        userName={userInfo?.name || 'User'}
        userRole={userInfo?.role || 'Unknown'}
        adminEmail="admin@hospital.com"
      />
    );
  }

  // Show content if access granted
  return <>{children}</>;
};
