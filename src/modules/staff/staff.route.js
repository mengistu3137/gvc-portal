import express from 'express';
import {
  createStaff,
  getStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} from './staff.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();
const auth = (permission) => [authenticate, authorize(permission)];

router.route('/')
  .post(auth('manage_staff'), createStaff)
  .get(auth('view_staff'), getStaff);

router.route('/:id')
  .get(auth('view_staff'), getStaffById)
  .put(auth('manage_staff'), updateStaff)
  .delete(auth('manage_staff'), deleteStaff);

export default router;
