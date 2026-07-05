// Permission-based authorization middleware
const normalizePermissionList = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return permissions
    .filter((item) => item !== undefined && item !== null)
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean);
};

const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    try {
      // Development bypass: allow all when DEV_BYPASS_AUTH=true or NODE_ENV=development
      if (process.env.DEV_BYPASS_AUTH === 'true' || process.env.NODE_ENV === 'development') {
        console.log(`[AUTH] Development bypass enabled - allowing ${req.method} ${req.path}`);
        return next();
      }
      if (!req.user) {
        console.warn(`[AUTH] Unauthorized access attempt to ${req.method} ${req.path} - no user in request`);
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      const userRole = String(req.user.role || 'unknown').toLowerCase();
      const effectivePermissions = normalizePermissionList(
        req.user.effectivePermissions || req.user.permissions || []
      );
      console.log(`[AUTH] Permission check: user=${userRole}, permissions=${effectivePermissions.join(',')}, endpoint=${req.method} ${req.path}, required=${requiredPermissions.join(',')}`);

      // Admin bypass: admins have full control
      if (userRole === 'admin') {
        console.log(`[AUTH] ✓ Admin user allowed - full access`);
        return next();
      }

      // Doctors may always retrieve their own doctor profile and availability slots
      // even if the specific doctors.view permission is not present on the token.
      const originalUrl = String(req.originalUrl || '').split('?')[0];
      if (userRole === 'doctor' && req.method === 'GET' && (originalUrl === '/api/doctors' || originalUrl === '/api/doctors/slots/available')) {
        console.log(`[AUTH] ✓ Doctor self-view allowed for ${req.method} ${originalUrl}`);
        return next();
      }

      if (!requiredPermissions || requiredPermissions.length === 0) {
        console.log(`[AUTH] ✓ No permission restriction on endpoint`);
        return next();
      }

      const hasPermission = requiredPermissions.some((perm) => effectivePermissions.includes(String(perm).trim().toLowerCase()));

      if (!hasPermission) {
        console.warn(`[AUTH] ✗ Forbidden: user permissions ${effectivePermissions.join(',')} do not include required [${requiredPermissions.join(',')}] for ${req.method} ${req.path}`);
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have access. Contact admin.' });
      }

      console.log(`[AUTH] ✓ User has required permission for ${req.method} ${req.path}`);
      return next();
    } catch (err) {
      console.error('Authorization error:', err);
      return res.status(500).json({ success: false, message: 'Authorization failure' });
    }
  };
};

module.exports = { authorize, requirePermission: authorize };
