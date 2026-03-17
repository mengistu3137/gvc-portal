import { ModulePrerequisite } from './enrollment.model.js';
import EnrollmentService from './enrollment.service.js';

export const createEnrollment = async (req, res, next) => {
  try {
    const data = await EnrollmentService.createEnrollment(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getEnrollments = async (req, res, next) => {
  try {
    const rows = await EnrollmentService.getEnrollments(req.query, req.user);
    res.json({ success: true, count: rows.length, rows });
  } catch (error) { next(error); }
};

export const updateEnrollment = async (req, res, next) => {
  try {
    const data = await EnrollmentService.updateEnrollment(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const checkEligibility = async (req, res, next) => {
  try {
    const { studentId, moduleId } = req.params;
    const data = await EnrollmentService.checkPrerequisites(studentId, moduleId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const calculateGpa = async (req, res, next) => {
  try {
    const { studentId, batchId } = req.params;
    const data = await EnrollmentService.calculateStudentGpa(studentId, batchId, req.user);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createPrerequisite = async (req, res, next) => {
  try {
    if (!(req.user?.permissions || []).includes('manage_enrollment')) {
      throw new Error('Forbidden: missing manage_enrollment permission.');
    }
    const data = await ModulePrerequisite.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const deleteEnrollment = async (req, res, next) => {
  try {
    const data = await EnrollmentService.deleteEnrollment(req.params.id, req.user);
    res.json({ success: true, message: 'Enrollment removed', data });
  } catch (error) { next(error); }
};
