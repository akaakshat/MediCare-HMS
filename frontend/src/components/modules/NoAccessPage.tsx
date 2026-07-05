// frontend/src/components/modules/NoAccessPage.tsx
// Component shown when user has no feature access

import React from 'react';
import { AlertCircle, Lock, Mail } from 'lucide-react';

interface NoAccessPageProps {
  userName?: string;
  userRole?: string;
  adminEmail?: string;
}

export const NoAccessPage: React.FC<NoAccessPageProps> = ({
  userName = 'User',
  userRole = 'Unknown',
  adminEmail = 'admin@hospital.com'
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-red-100 rounded-full">
            <Lock size={48} className="text-red-600" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Not Granted
        </h1>

        {/* Message */}
        <div className="mb-6 space-y-3 text-left">
          <p className="text-gray-700">
            Hello <strong>{userName}</strong>,
          </p>
          <p className="text-gray-600">
            Your account has been created as a <strong>{userRole}</strong>, but no features or modules have been enabled for your access yet.
          </p>
          <p className="text-gray-600">
            To get started, you need to contact your system administrator to grant you the necessary permissions.
          </p>
        </div>

        {/* Alert Box */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="font-medium text-yellow-900 text-sm mb-1">
              What happens next?
            </p>
            <p className="text-yellow-800 text-xs">
              Ask your administrator to grant you feature access for your role. Once they do, your dashboard will be available.
            </p>
          </div>
        </div>

        {/* Contact Admin */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">Contact your administrator:</p>
          <a
            href={`mailto:${adminEmail}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Mail size={16} />
            Send Email
          </a>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Account Role: <strong>{userRole}</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Status: <strong className="text-orange-600">Awaiting Permissions</strong>
          </p>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-3 bg-gray-50 rounded text-xs text-gray-600">
          <p>
            If you believe this is an error, please contact your IT support team or the system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};
