import express from 'express';
const router = express.Router();

// Import individual module routes
import authRoutes from './auth/auth.route.js';
import academicRoutes from './academics/academic.route.js';
import instructorRoutes from './instructors/instructor.route.js';
import studentRoutes from './students/student.route.js';
// import curriculumRoutes from './curriculum/curriculum.route.js'; // Future
// import financeRoutes from './finance/finance.route.js'; // Future

/**
 * Main API Route entry point
 * All routes here will be prefixed with /api
 */

// Auth endpoints: /api/auth/login, etc.
router.use('/auth', authRoutes);

// Academics endpoints: /api/academics/departments, etc.
router.use('/academics', academicRoutes);
router.use('/instructors', instructorRoutes);

// Student endpoints: /api/students/register, etc.

router.use('/students', studentRoutes);

// Curriculum endpoints: /api/curriculum/modules, etc.
// router.use('/curriculum', curriculumRoutes);

// Error handling for 404 routes within /api
// router.use('/*', (req, res) => {
//   res.status(404).json({ success: false, message: 'API Endpoint not found' });
// });

export default router;