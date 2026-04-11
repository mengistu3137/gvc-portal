import express from 'express';
import {
  deleteUser,
  createUser,
  getUsers,
  updateUser,
  login,
  forgotPassword,
  resetPassword,
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignRolesToAccount,
  unassignRolesFromAccount,
  assignPermissionsToRole,
  unassignPermissionsFromRole
} from './auth.controller.js';
// Both imported from the same file now
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();

// Password reset (public)
router.post('/forgot', forgotPassword);
router.post('/forget/:token', resetPassword);

// Public login
router.post('/login', login);

// CRUD routes secured by identity (authenticate) and capability (authorize)
router.get('/', 
  authenticate, 
  authorize('view_users'), 
  getUsers
);

router.post('/create', 
  authenticate, 
  authorize('manage_users'), 
  createUser
);

router.route('/roles')
  .post(authenticate, authorize('manage_roles'), createRole)
  .get(authenticate, authorize('manage_roles'), getRoles);

router.route('/roles/:roleId')
  .get(authenticate, authorize('manage_roles'), getRoleById)
  .put(authenticate, authorize('manage_roles'), updateRole)
  .delete(authenticate, authorize('manage_roles'), deleteRole);

router.post('/roles/:roleId/permissions', authenticate, authorize('manage_roles'), assignPermissionsToRole);
router.post('/roles/:roleId/permissions/unassign', authenticate, authorize('manage_roles'), unassignPermissionsFromRole);

router.post('/accounts/:accountId/roles', authenticate, authorize('manage_users'), assignRolesToAccount);
router.post('/accounts/:accountId/roles/unassign', authenticate, authorize('manage_users'), unassignRolesFromAccount);

router.put('/:id', 
  authenticate, 
  authorize('manage_users'), 
  updateUser
);

router.delete('/:id', 
  authenticate, 
  authorize('manage_users'), 
  deleteUser
);

export default router;