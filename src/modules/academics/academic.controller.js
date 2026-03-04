import AcademicService from './academic.service.js';

export const addDepartment = async (req, res) => {
  try {
    const dept = await AcademicService.createDepartment(req.body);
    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const listDepartments = async (req, res) => {
  try {
    const depts = await AcademicService.getAllDepartments();
    res.json({ success: true, data: depts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addBatch = async (req, res) => {
  try {
    const batch = await AcademicService.createBatch(req.body);
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};