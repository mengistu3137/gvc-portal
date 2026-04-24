import express from 'express';
import {
  getEnrollments,
  createEnrollment,
  updateEnrollment,
  calculateGpa,
  deleteEnrollment,
  getEnrolledStudentsWithGrades,
  getStudentGradesForOffering
 
} from './enrollment.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();
const auth = (permission) => [authenticate, authorize(permission)];

router.get('/', auth('manage_enrollment'), getEnrollments);
router.post('/', auth('manage_enrollment'), createEnrollment);
// Add these routes to your existing router

router.get('/offering/:offering_id/students-with-grades', 
  auth('manage_grading'), 
  getEnrolledStudentsWithGrades
);

router.get('/student/:student_pk/offering/:offering_id/grades', 
  auth('manage_grading'), 
  getStudentGradesForOffering
);
router.put('/:id', auth('manage_enrollment'), updateEnrollment);
router.delete('/:id', auth('manage_enrollment'), deleteEnrollment);
router.get('/gpa/:studentId/:levelId', auth('view_academic_progress'), calculateGpa);

export default router;
