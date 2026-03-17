import express from 'express';
import * as ctrl from './instructor.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';
import { profilePhotoUpload } from '../../middlewares/upload.js';

const router = express.Router();

const auth = (permission) => [authenticate, authorize(permission)];

router.route('/')
	.post(auth('manage_instructors'), ctrl.createInstructor)
	.get(auth('view_instructors'), ctrl.getInstructors);

router.route('/:id')
	.get(auth('view_instructors'), ctrl.getInstructorById)
	.put(auth('manage_instructors'), ctrl.updateInstructor)
	.delete(auth('manage_instructors'), ctrl.deleteInstructor);

router.post('/:id/photo', auth('manage_instructors'), profilePhotoUpload.single('photo'), ctrl.uploadInstructorPhoto);

export default router;