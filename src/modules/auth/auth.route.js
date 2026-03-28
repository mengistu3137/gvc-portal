import express from 'express';
import { deleteUser, createUser, getUsers, updateUser, login, forgotPassword, resetPassword } from './auth.controller.js';
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