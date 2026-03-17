import StaffService from './staff.service.js';

export const createStaff = async (req, res, next) => {
  try {
    const data = await StaffService.createStaff(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getStaff = async (req, res, next) => {
  try {
    const result = await StaffService.getAllStaff(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const getStaffById = async (req, res, next) => {
  try {
    const data = await StaffService.getStaffById(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateStaff = async (req, res, next) => {
  try {
    const data = await StaffService.updateStaff(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const deleteStaff = async (req, res, next) => {
  try {
    await StaffService.deleteStaff(req.params.id);
    res.json({ success: true, message: 'Staff archived' });
  } catch (error) { next(error); }
};
