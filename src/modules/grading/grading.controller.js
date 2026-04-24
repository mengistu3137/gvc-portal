import { GradeSubmission, Assessment } from './grading.model.js';
import { ModuleOffering } from '../enrollment/enrollment.model.js';
import { Staff } from '../staff/staff.model.js';
import GradingService from './grading.service.js';
export const getSubmissions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const rows = await GradeSubmission.findAll({
      where,
      include: [
        { model: ModuleOffering, as: 'module_offering' }, // Eager load for context
        { model: Staff, as: 'instructor' } // Assuming alias in model
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({
      success: true,
      count: rows.length,
      rows: rows.map((row) => GradingService.formatSubmissionForView(row))
    });
  } catch (error) { next(error); }
};

export const getSubmissionById = async (req, res, next) => {
  try {
    const data = await GradeSubmission.findByPk(req.params.id, {
      include: [
        { model: ModuleOffering, as: 'module_offering' },
        { model: Staff, as: 'instructor' }
      ]
    });
    if (!data) throw new Error('Submission not found');
    res.json({ success: true, data: GradingService.formatSubmissionForView(data) });
  } catch (error) { next(error); }
};

export const createSubmission = async (req, res, next) => {
  try {
    // Note: This creates a shell. Typically 'submitGradesForApproval' is preferred.
    const data = await GradeSubmission.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const upsertStudentGrade = async (req, res, next) => {
  try {
    const data = await GradingService.upsertStudentGrade(req.body, req.user);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const upsertStudentGradesBulk = async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const data = await GradingService.upsertStudentGradesBulk(rows, req.user);
    res.status(201).json({ success: true, count: data.length, rows: data });
  } catch (error) { next(error); }
};

export const importStudentGradesBulk = async (req, res, next) => {
  try {
    const mapping = typeof req.body?.mapping === 'string'
      ? JSON.parse(req.body.mapping || '{}')
      : (req.body?.mapping || {});

    const data = await GradingService.upsertStudentGradesBulkFromSpreadsheet(req.file, mapping, req.user);
    res.status(201).json({ success: true, count: data.length, rows: data });
  } catch (error) { next(error); }
};

// --- UPDATED / NEW CONTROLLERS ---

// Replaces 'changeSubmissionStatus' for the full workflow
export const submitGradesForApproval = async (req, res, next) => {
  try {
    const { offering_id } = req.body;
    const instructor_id = req.user.staff_id; // Assuming user object has staff_id

    const data = await GradingService.submitGradesForApproval(offering_id, instructor_id);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const approveGradeSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, role } = req.body; // status: 'APPROVED' | 'REJECTED', role: 'REGISTRAR' etc.
    const approver_id = req.user.staff_id;

    const data = await GradingService.approveGradeSubmission(id, approver_id, role, status);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const calculateStudentGpa = async (req, res, next) => {
  try {
    const { student_pk, batch_id, level_id } = req.params;
    
    // If level_id is optional in route, you might need to fetch it from Batch, 
    // but the service handles nulls. Here we pass whatever is in params.
    const data = await GradingService.calculateStudentGpa(student_pk, batch_id, level_id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getStudentTranscript = async (req, res, next) => {
  try {
    const { student_pk } = req.params;
    const data = await GradingService.getStudentTranscript(student_pk);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getModuleGradeSheet = async (req, res, next) => {
  try {
    const { offering_id } = req.params;
    const data = await GradingService.getModuleGradeSheet(offering_id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

// Keep legacy endpoint if needed, or map it to the new service
export const changeSubmissionStatus = async (req, res, next) => {
  try {
    const { next_status, note } = req.body;
    const data = await GradingService.changeSubmissionStatus(req.params.id, next_status, req.user, note);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const calculateFinalGrade = async (req, res, next) => {
  try {
    const { studentId, offeringId } = req.params;
    const data = await GradingService.calculateStudentFinalGrade(studentId, offeringId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const listAssessments = async (req, res, next) => {
  try {
    const rows = await Assessment.findAll({
      where: { offering_id: req.params.offeringId },
      order: [['assessment_id', 'ASC']]
    });
    res.json({ success: true, count: rows.length, rows });
  } catch (error) { next(error); }
};