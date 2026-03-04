import express from 'express';
import * as ctrl from './auth.controller.js';
// Both imported from the same file now
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();

// Public login
router.post('/login', ctrl.login);

// CRUD routes secured by identity (authenticate) and capability (authorize)
router.get('/', 
  authenticate, 
  authorize('view_users'), 
  ctrl.getUsers
);

router.post('/create', 
  authenticate, 
  authorize('manage_users'), 
  ctrl.createUser
);

router.delete('/:id', 
  authenticate, 
  authorize('manage_users'), 
  ctrl.deleteUser
);

export default router;