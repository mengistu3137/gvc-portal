import express from 'express';
import {
  getEnrollments,
  createEnrollment,
  updateEnrollment,
  calculateGpa,
  deleteEnrollment,
  listOfferings
} from './enrollment.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();
const auth = (permission) => [authenticate, authorize(permission)];

router.get('/', auth('manage_enrollment'), getEnrollments);
router.post('/', auth('manage_enrollment'), createEnrollment);
router.put('/:id', auth('manage_enrollment'), updateEnrollment);
router.delete('/:id', auth('manage_enrollment'), deleteEnrollment);
router.get('/offerings', auth('manage_enrollment'), listOfferings);
router.get('/gpa/:studentId/:levelId', auth('view_academic_progress'), calculateGpa);

export default router;
