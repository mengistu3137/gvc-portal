import InstructorService from './instructor.service.js';

export const createInstructor = async (req, res, next) => {
  try {
    const instructor = await InstructorService.createInstructor(req.body);
    res.status(201).json({ success: true, data: instructor });
  } catch (error) { next(error); }
};

export const getInstructors = async (req, res, next) => {
  try {
    const result = await InstructorService.getInstructors(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const updateInstructor = async (req, res, next) => {
  try {
    const instructor = await InstructorService.updateInstructor(req.params.id, req.body);
    res.json({ success: true, data: instructor });
  } catch (error) { next(error); }
};

export const deleteInstructor = async (req, res, next) => {
  try {
    await InstructorService.deleteInstructor(req.params.id);
    res.json({ success: true, message: "Instructor record archived" });
  } catch (error) { next(error); }
};