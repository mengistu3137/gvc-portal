import express from 'express';
import {deleteUser, createUser, getUsers,updateUser, login, getRoles, getPermissions} from './auth.controller.js';
// Both imported from the same file now
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();

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

router.get('/roles',
  authenticate,
  authorize('view_users'),
  getRoles
);

router.get('/permissions',
  authenticate,
  authorize('view_users'),
  getPermissions
);

export default router;