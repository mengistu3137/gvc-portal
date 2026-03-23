import AcademicService from './academic.service.js';

function validateAssessments(assessments) {
  if (assessments === undefined) return;
  if (!Array.isArray(assessments)) {
    throw new Error('assessments must be an array of {name, weight} items');
  }

  const totalWeight = assessments.reduce((sum, item) => sum + Number(item?.weight || 0), 0);
  if (Math.round(totalWeight) !== 100) {
    throw new Error('Assessment weights must sum to 100');
  }
}

// --- CURRICULUM HANDLERS ---

export const addModuleToLevel = async (req, res, next) => {
  try {
    const data = await AcademicService.addModuleToLevel(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getLevelModules = async (req, res, next) => {
  try {
    // Updated: Service expects occupation_id first, then level_id
    const { occupation_id, level_id } = req.params;
    
    const data = await AcademicService.getLevelModules(occupation_id, level_id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const removeModuleFromLevel = async (req, res, next) => {
  try {
    // id refers to level_module_id
    await AcademicService.removeModuleFromLevel(req.params.id);
    res.json({ success: true, message: 'Module removed from curriculum' });
  } catch (error) { next(error); }
};

// --- SECTOR HANDLERS ---
export const createSector = async (req, res, next) => {
  try {
    const data = await AcademicService.createSector(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getSectors = async (req, res, next) => {
  try {
    const data = await AcademicService.getSectors(req.query);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getSectorById = async (req, res, next) => {
  try {
    const data = await AcademicService.getSectorById(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateSector = async (req, res, next) => {
  try {
    const data = await AcademicService.updateSector(req.params.id, req.body);
    res.json({ success: true, message: 'Sector updated successfully', data });
  } catch (error) { next(error); }
};

export const deleteSector = async (req, res, next) => {
  try {
    await AcademicService.deleteSector(req.params.id);
    res.json({ success: true, message: 'Sector deleted successfully' });
  } catch (error) { next(error); }
};

// --- OCCUPATION HANDLERS ---
export const createOccupation = async (req, res, next) => {
  try {
    const data = await AcademicService.createOccupation(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getOccupations = async (req, res, next) => {
  try {
    const result = await AcademicService.getOccupations(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const getOccupationById = async (req, res, next) => {
  try {
    const data = await AcademicService.getOccupationById(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateOccupation = async (req, res, next) => {
  try {
    const data = await AcademicService.updateOccupation(req.params.id, req.body);
    res.json({ success: true, message: "Occupation updated successfully", data });
  } catch (error) { next(error); }
};

export const deleteOccupation = async (req, res, next) => {
  try {
    await AcademicService.deleteOccupation(req.params.id);
    res.json({ success: true, message: "Occupation deleted successfully" });
  } catch (error) { next(error); }
};

// --- MODULE HANDLERS ---
export const createModule = async (req, res, next) => {
  try {
    validateAssessments(req.body.assessments);
    const data = await AcademicService.createModule(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getModules = async (req, res, next) => {
  try {
    const result = await AcademicService.getModules(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const getModuleById = async (req, res, next) => {
  try {
    const data = await AcademicService.getModuleById(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateModule = async (req, res, next) => {
  try {
    // Updated: Now uses module_id (integer) instead of m_code
    validateAssessments(req.body.assessments);
    const data = await AcademicService.updateModule(req.params.id, req.body);
    res.json({ success: true, message: "Module updated successfully", data });
  } catch (error) { next(error); }
};

export const deleteModule = async (req, res, next) => {
  try {
    // Updated: Now uses module_id (integer)
    await AcademicService.deleteModule(req.params.id);
    res.json({ success: true, message: "Module deleted successfully" });
  } catch (error) { next(error); }
};

// --- BATCH HANDLERS ---
export const createBatch = async (req, res, next) => {
  try {
    const data = await AcademicService.createBatch(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getBatches = async (req, res, next) => {
  try {
    const result = await AcademicService.getBatches(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const getBatchById = async (req, res, next) => {
  try {
    const data = await AcademicService.getBatchById(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateBatch = async (req, res, next) => {
  try {
    const data = await AcademicService.updateBatch(req.params.id, req.body);
    res.json({ success: true, message: "Batch updated successfully", data });
  } catch (error) { next(error); }
};

export const deleteBatch = async (req, res, next) => {
  try {
    await AcademicService.deleteBatch(req.params.id);
    res.json({ success: true, message: "Batch deleted successfully" });
  } catch (error) { next(error); }
};

// --- ACADEMIC YEAR HANDLERS ---
export const createAcademicYear = async (req, res, next) => {
  try {
    const data = await AcademicService.createAcademicYear(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getAcademicYears = async (req, res, next) => {
  try {
    const data = await AcademicService.getAcademicYears();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getAcademicYearById = async (req, res, next) => {
  try {
    const data = await AcademicService.getAcademicYearById(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateAcademicYear = async (req, res, next) => {
  try {
    const data = await AcademicService.updateAcademicYear(req.params.id, req.body);
    res.json({ success: true, message: "Academic Year updated successfully", data });
  } catch (error) { next(error); }
};

export const deleteAcademicYear = async (req, res, next) => {
  try {
    await AcademicService.deleteAcademicYear(req.params.id);
    res.json({ success: true, message: "Academic Year deleted successfully" });
  } catch (error) { next(error); }
};

// --- LEVEL HANDLERS ---
export const createLevel = async (req, res, next) => {
  try {
    const data = await AcademicService.createLevel(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getLevels = async (req, res, next) => {
  try {
    // Updated: Pass query params for filtering
    const data = await AcademicService.getLevels(req.query);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getLevelById = async (req, res, next) => {
  try {
    // Updated: Handle Composite Key (level_id + occupation_id)
    // Assuming route is /levels/:level_id/:occupation_id
    const { level_id, occupation_id } = req.params;
    const data = await AcademicService.getLevelById(level_id, occupation_id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateLevel = async (req, res, next) => {
  try {
    // Updated: Handle Composite Key
    const { level_id, occupation_id } = req.params;
    const data = await AcademicService.updateLevel(level_id, occupation_id, req.body);
    res.json({ success: true, message: 'Level updated successfully', data });
  } catch (error) { next(error); }
};

export const deleteLevel = async (req, res, next) => {
  try {
    // Updated: Handle Composite Key
    const { level_id, occupation_id } = req.params;
    await AcademicService.deleteLevel(level_id, occupation_id);
    res.json({ success: true, message: 'Level deleted successfully' });
  } catch (error) { next(error); }
};