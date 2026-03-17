import express from 'express';
import {
  getEnrollments,
  createEnrollment,
  updateEnrollment,
  checkEligibility,
  calculateGpa,
  createPrerequisite,
  deleteEnrollment
} from './enrollment.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();
const auth = (permission) => [authenticate, authorize(permission)];

router.get('/', auth('manage_enrollment'), getEnrollments);
router.post('/', auth('manage_enrollment'), createEnrollment);
router.put('/:id', auth('manage_enrollment'), updateEnrollment);
router.delete('/:id', auth('manage_enrollment'), deleteEnrollment);
router.post('/prerequisites', auth('manage_enrollment'), createPrerequisite);
router.get('/eligibility/:studentId/:moduleId', auth('manage_enrollment'), checkEligibility);
router.get('/gpa/:studentId/:batchId', auth('view_academic_progress'), calculateGpa);

export default router;
