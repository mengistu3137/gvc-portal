import StudentService from './student.service.js';

export const createStudent = async (req, res, next) => {
  try {
    const data = await StudentService.createStudent(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getStudents = async (req, res, next) => {
  try {
    const result = await StudentService.getStudents(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const getStudentById = async (req, res, next) => {
  try {
    const data = await StudentService.getStudentById(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateStudent = async (req, res, next) => {
  try {
    const data = await StudentService.updateStudent(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const deleteStudent = async (req, res, next) => {
  try {
    await StudentService.deleteStudent(req.params.id);
    res.json({ success: true, message: "Student archived" });
  } catch (error) { next(error); }
};