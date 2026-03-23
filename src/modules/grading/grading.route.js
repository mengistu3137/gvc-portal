import express from 'express';
import {
	listAssessmentTasks,
	getAssessmentTaskById,
	createAssessmentTask,
	updateAssessmentTask,
	deleteAssessmentTask,
	listStudentGrades,
	getStudentGradeById,
	createStudentGrade,
	updateStudentGrade,
	deleteStudentGrade,
	upsertStudentGrade,
	upsertStudentGradesBulk,
	importStudentGradesBulk,
	getSubmissions,
	getSubmissionById,
	createSubmission,
	updateSubmission,
	deleteSubmission,
	changeSubmissionStatus,
	listPolicies,
	getPolicyById,
	createPolicy,
	updatePolicy,
	deletePolicy,
	listScaleItems,
	getScaleItemById,
	addScaleItem,
	addScaleItemsBulk,
	updateScaleItem,
	deleteScaleItem,
	listModuleEnrollments,
	getModuleEnrollmentById,
	createModuleEnrollment,
	updateModuleEnrollment,
	deleteModuleEnrollment,
	calculateFinalGrade,
	getBatchModuleEnrollments
} from './grading.controller.js';

import { authenticate, authorize } from '../../middlewares/authGuard.js';
import { spreadsheetUpload } from '../../middlewares/upload.js';

const router = express.Router();

const auth = (permission) => [authenticate, authorize(permission)];

router.route('/tasks')
	.get(auth('view_grading'), listAssessmentTasks)
	.post(auth('manage_grading'), createAssessmentTask);

router.route('/tasks/:taskId')
	.get(auth('view_grading'), getAssessmentTaskById)
	.put(auth('manage_grading'), updateAssessmentTask)
	.delete(auth('manage_grading'), deleteAssessmentTask);

router.route('/grades')
	.get(auth('view_grading'), listStudentGrades)
	.post(auth('manage_grading'), createStudentGrade);

router.route('/grades/:gradeId')
	.get(auth('view_grading'), getStudentGradeById)
	.put(auth('manage_grading'), updateStudentGrade)
	.delete(auth('manage_grading'), deleteStudentGrade);

router.post('/grades/upsert', auth('manage_grading'), upsertStudentGrade);
router.post('/grades/bulk', auth('manage_grading'), upsertStudentGradesBulk);
router.post('/grades/import', auth('manage_grading'), spreadsheetUpload.single('file'), importStudentGradesBulk);

router.route('/submissions')
	.get(auth('view_grading'), getSubmissions)
	.post(auth('manage_grading'), createSubmission);

router.route('/submissions/:id')
	.get(auth('view_grading'), getSubmissionById)
	.put(auth('manage_grading'), updateSubmission)
	.delete(auth('manage_grading'), deleteSubmission);

router.put('/submissions/:id/status', authenticate, changeSubmissionStatus);
router.patch('/submissions/:id/status', authenticate, changeSubmissionStatus);

router.route('/policies')
	.get(auth('manage_grading_policy'), listPolicies)
	.post(auth('manage_grading_policy'), createPolicy);

router.route('/policies/:policyId')
	.get(auth('manage_grading_policy'), getPolicyById)
	.put(auth('manage_grading_policy'), updatePolicy)
	.delete(auth('manage_grading_policy'), deletePolicy);

router.get('/policies/:policyId/scale-items', auth('manage_grading_policy'), listScaleItems);
router.post('/policies/:policyId/scale-items', auth('manage_grading_policy'), addScaleItem);
router.post('/policies/:policyId/scale-items/bulk', auth('manage_grading_policy'), addScaleItemsBulk);

router.route('/scale-items/:scaleItemId')
	.get(auth('manage_grading_policy'), getScaleItemById)
	.put(auth('manage_grading_policy'), updateScaleItem)
	.delete(auth('manage_grading_policy'), deleteScaleItem);

router.route('/enrollments')
	.get(auth('view_grading'), listModuleEnrollments)
	.post(auth('manage_grading'), createModuleEnrollment);

router.route('/enrollments/:enrollmentId')
	.get(auth('view_grading'), getModuleEnrollmentById)
	.put(auth('manage_grading'), updateModuleEnrollment)
	.delete(auth('manage_grading'), deleteModuleEnrollment);

router.get('/outcomes/:batchId/:moduleId', auth('view_grading'), getBatchModuleEnrollments);

router.get('/calculate/:studentId/:moduleId/:batchId', authenticate, calculateFinalGrade);

export default router;