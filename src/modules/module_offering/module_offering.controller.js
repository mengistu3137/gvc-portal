import ModuleOfferingService from './module_offering.service.js';

export const createOffering = async (req, res, next) => {
  try {
    const data = await ModuleOfferingService.createOffering(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getOfferings = async (req, res, next) => {
  try {
    const rows = await ModuleOfferingService.getAllOfferings(req.query);
    res.json({ success: true, count: rows.length, rows });
  } catch (error) { next(error); }
};

export const getOfferingById = async (req, res, next) => {
  try {
    const data = await ModuleOfferingService.getOfferingById(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateOffering = async (req, res, next) => {
  try {
    const data = await ModuleOfferingService.updateOffering(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const deleteOffering = async (req, res, next) => {
  try {
    await ModuleOfferingService.deleteOffering(req.params.id);
    res.json({ success: true, message: 'Offering deleted successfully' });
  } catch (error) { next(error); }
};