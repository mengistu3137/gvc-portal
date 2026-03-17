import express from 'express';
import {
	getSubmissions,
	getSubmissionById,
	createAssessmentPlan,
	createAssessmentTask,
	createSubmission,
	upsertStudentGrade,
	upsertStudentGradesBulk,
	importStudentGradesBulk,
	changeSubmissionStatus,
	createPolicy,
	addScaleItem,
	updateScaleItem,
	calculateFinalGrade
} from './grading.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';
import { spreadsheetUpload } from '../../middlewares/upload.js';

const router = express.Router();

const auth = (permission) => [authenticate, authorize(permission)];

router.post('/plans', auth('manage_grading'), createAssessmentPlan);
router.post('/plans/:planId/tasks', auth('manage_grading'), createAssessmentTask);

router.get('/submissions', auth('manage_grading'), getSubmissions);
router.get('/submissions/:id', auth('manage_grading'), getSubmissionById);
router.post('/submissions', auth('manage_grading'), createSubmission);
router.post('/grades', auth('manage_grading'), upsertStudentGrade);
router.post('/grades/bulk', auth('manage_grading'), upsertStudentGradesBulk);
router.post('/grades/import', auth('manage_grading'), spreadsheetUpload.single('file'), importStudentGradesBulk);

router.put('/submissions/:id/status', authenticate, changeSubmissionStatus);

router.post('/policies', auth('manage_grading_policy'), createPolicy);
router.post('/policies/:policyId/scale-items', auth('manage_grading_policy'), addScaleItem);
router.put('/scale-items/:scaleItemId', auth('manage_grading_policy'), updateScaleItem);

router.get('/calculate/:studentId/:moduleId/:batchId', authenticate, calculateFinalGrade);

export default router;
