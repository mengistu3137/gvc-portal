import express from 'express';
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} from './student.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();

// --- MIDDLEWARE UTILS ---
// Helper to apply both authentication and granular permission check
const auth = (permission) => [authenticate, authorize(permission)];

// --- STUDENT ROUTES ---

/**
 * Route: /api/students
 * POST: Register a new student (Atomic ID Generation)
 * GET:  List students with PFSS (Pagination, Filtering, Sorting, Searching)
 */
router.route('/')
  .post(auth('manage_student'), createStudent)
  .get(auth('view_students'), getStudents);

/**
 * Route: /api/students/:id
 * GET:    Fetch a specific student profile including Batch/Occupation/Level
 * PUT:    Update student profile details
 * DELETE: Soft-delete student record (Move to archive)
 */
router.route('/:id')
  .get(auth('view_students'), getStudentById)
  .put(auth('manage_student'), updateStudent)
  .delete(auth('manage_student'), deleteStudent);

export default router;