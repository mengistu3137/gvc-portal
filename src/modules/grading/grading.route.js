import express from 'express';
import {
    getSubmissions,
    getSubmissionById,
    createSubmission,
    upsertStudentGrade,
    upsertStudentGradesBulk,
    importStudentGradesBulk,
    changeSubmissionStatus,
    calculateFinalGrade,
    listAssessments,
    // New Imports
    submitGradesForApproval,
    approveGradeSubmission,
    calculateStudentGpa,
    getStudentTranscript,
    getModuleGradeSheet
} from './grading.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';
import { spreadsheetUpload } from '../../middlewares/upload.js';

const router = express.Router();

// Helper for middleware chains
const auth = (permission) => [authenticate, authorize(permission)];

// --- EXISTING ROUTES ---

// Submissions
router.get('/submissions', auth('manage_grading'), getSubmissions);
router.get('/submissions/:id', auth('manage_grading'), getSubmissionById);
router.post('/submissions', auth('manage_grading'), createSubmission); // Manual shell creation

// Grading Entry
router.post('/grades', auth('manage_grading'), upsertStudentGrade);
router.post('/grades/bulk', auth('manage_grading'), upsertStudentGradesBulk);
router.post('/grades/import', auth('manage_grading'), spreadsheetUpload.single('file'), importStudentGradesBulk);


// Assessments
router.get('/assessments/:offeringId', auth('manage_grading'), listAssessments);

// Legacy/Status
router.put('/submissions/:id/status', authenticate, changeSubmissionStatus);
router.get('/calculate/:studentId/:offeringId', authenticate, calculateFinalGrade);

// --- NEW ROUTES (WORKFLOW & REPORTING) ---

// Workflow: Submit for Approval
// Payload: { offering_id }
router.post('/submissions/submit', auth('manage_grading'), submitGradesForApproval);

// Workflow: Approve/Reject
// Params: id (submission_id)
// Payload: { status: 'APPROVED' | 'REJECTED', role: 'DEAN' }
router.put('/submissions/:id/approve', auth('approve_grades'), approveGradeSubmission);

// Reporting: Module Grade Sheet (Instructor View)
router.get('/sheet/:offering_id', auth('manage_grading'), getModuleGradeSheet);

// Reporting: Student Transcript
router.get('/transcript/:student_pk', authenticate, getStudentTranscript);

// Academic: Calculate/Update GPA
router.post('/gpa/calculate/:student_pk/:batch_id/:level_id', auth('manage_grading'), calculateStudentGpa);

export default router;