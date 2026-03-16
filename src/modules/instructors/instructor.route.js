import express from 'express';
import * as ctrl from './instructor.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();

router.post('/create', authenticate, authorize('manage_instructors'), ctrl.createInstructor);
router.get('/', authenticate, authorize('view_instructors'), ctrl.getInstructors);
router.put('/:id', authenticate, authorize('manage_instructors'), ctrl.updateInstructor);
router.delete('/:id', authenticate, authorize('manage_instructors'), ctrl.deleteInstructor);

export default router;