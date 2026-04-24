import jwt from 'jsonwebtoken';
import { UserAccount } from '../modules/auth/auth.model.js';

/**
 * Global Authentication Middleware
 * Renamed from 'protect' to 'authenticate'.
 * Validates JWT and ensures the user account is still ACTIVE.
 */
export const authenticate = async (req, res, next) => {
  let token;

  // 1. Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. High-Security Check: Ensure user still exists and status is 'ACTIVE' in DB
    const userId = decoded.userId ?? decoded.user_id;
    const accountId = decoded.accountId ?? decoded.account_id;

    if (!userId && !accountId) {
      return res.status(401).json({ success: false, message: 'Invalid token payload.' });
    }

    const user = await UserAccount.findOne({
      where: userId
        ? { user_id: userId }
        : { account_id: accountId },
      attributes: ['account_id', 'user_id', 'status', 'email']
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ 
        success: false, 
        message: 'User account is no longer active or has been deleted.' 
      });
    }

    // 4. Attach user identity and capabilities (Permissions/Roles) to the request
    req.user = {
      id: user.user_id,
      account_id: user.account_id,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Granular Authorization Middleware
 * Checks if the authenticated user has the required snake_case permission.
 */
export const authorize = (requiredPermission) => {
  return (req, res, next) => {
    // Safety check: ensure authenticate was called first
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Check if the user's permission array contains the required string
    const hasPermission = req.user.permissions.includes(requiredPermission);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have the [${requiredPermission}] permission.`
      });
    }

    next();
  };
};