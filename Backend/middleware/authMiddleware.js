const jwt = require("jsonwebtoken");
const { getEffectivePermissions, normalizeStringArray } = require('../services/rbacService');

const JWT_SECRET = process.env.JWT_SECRET || "hospital-dev-secret-change-me";

const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    // Normalize role to lowercase so backend role checks stay consistent
    if (decoded && decoded.role) {
      decoded.role = decoded.role.toString().toLowerCase();
    }

    // Normalize permissions from the token and compute effective permissions based on role.
    decoded.permissions = normalizeStringArray(decoded.permissions || []);
    decoded.effectivePermissions = getEffectivePermissions(decoded);

    req.user = decoded; // attach user data to request

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Role-based authorization middleware
 * Usage: authorize('admin', 'doctor', 'nurse')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires one of these roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
