import express from 'express';
import {
	getSubmissions,
	getSubmissionById,
	createSubmission,
	upsertStudentGrade,
	upsertStudentGradesBulk,
	importStudentGradesBulk,
	changeSubmissionStatus,
	createPolicy,
	calculateFinalGrade
} from './grading.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';
import { spreadsheetUpload } from '../../middlewares/upload.js';

const router = express.Router();

const auth = (permission) => [authenticate, authorize(permission)];

router.get('/submissions', auth('manage_grading'), getSubmissions);
router.get('/submissions/:id', auth('manage_grading'), getSubmissionById);
router.post('/submissions', auth('manage_grading'), createSubmission);
router.post('/grades', auth('manage_grading'), upsertStudentGrade);
router.post('/grades/bulk', auth('manage_grading'), upsertStudentGradesBulk);
router.post('/grades/import', auth('manage_grading'), spreadsheetUpload.single('file'), importStudentGradesBulk);

router.put('/submissions/:id/status', authenticate, changeSubmissionStatus);

router.post('/policies', auth('manage_grading_policy'), createPolicy);

router.get('/calculate/:studentId/:moduleId/:batchId', authenticate, calculateFinalGrade);

export default router;
