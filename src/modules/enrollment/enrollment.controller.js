import EnrollmentService from './enrollment.service.js';

// Add these methods to your existing controller

export const getEnrolledStudentsWithGrades = async (req, res, next) => {
  try {
    const { offering_id } = req.params;
    const result = await EnrollmentService.getEnrolledStudentsWithGrades(offering_id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getStudentGradesForOffering = async (req, res, next) => {
  try {
    const { student_pk, offering_id } = req.params;
    const result = await EnrollmentService.getStudentGradesForOffering(student_pk, offering_id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

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

export const calculateGpa = async (req, res, next) => {
  try {
    const { studentId, levelId } = req.params;
    const data = await EnrollmentService.calculateStudentGpa(studentId, levelId, req.user);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const deleteEnrollment = async (req, res, next) => {
  try {
    const data = await EnrollmentService.deleteEnrollment(req.params.id, req.user);
    res.json({ success: true, message: 'Enrollment removed', data });
  } catch (error) { next(error); }
};

