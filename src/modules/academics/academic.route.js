import express from 'express';
import {
  createSector, getSectors, updateSector, deleteSector, getSectorById,
  createOccupation, getOccupations, updateOccupation, deleteOccupation, getOccupationById,
  createModule, getModules, updateModule, deleteModule, getModuleById,
  createBatch, getBatches, updateBatch, deleteBatch, getBatchById,
  createAcademicYear, getAcademicYears, updateAcademicYear, deleteAcademicYear, getAcademicYearById,
  createLevel, getLevels, updateLevel, deleteLevel, getLevelById,
  addModuleToLevel, getLevelModules, removeModuleFromLevel
} from './academic.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();

// --- MIDDLEWARE UTILS ---
// Apply common middleware for cleaner code
const auth = (permission) => [authenticate, authorize(permission)];

// --- SECTOR ROUTES ---
router.route('/sectors')
  .post(auth('manage_sector'), createSector)
  .get(auth('view_sector'), getSectors);

router.route('/sectors/:id')
  .get(auth('view_sector'), getSectorById)
  .put(auth('manage_sector'), updateSector)
  .delete(auth('manage_sector'), deleteSector);

// --- OCCUPATION ROUTES ---
router.route('/occupations')
  .post(auth('manage_occupation'), createOccupation)
  .get(auth('view_occupation'), getOccupations);

router.route('/occupations/:id')
  .get(auth('view_occupation'), getOccupationById)
  .put(auth('manage_occupation'), updateOccupation)
  .delete(auth('manage_occupation'), deleteOccupation);

// --- MODULE ROUTES ---
router.route('/modules')
  .post(auth('manage_module'), createModule)
  .get(auth('view_module'), getModules);

router.route('/modules/:id')
  .get(auth('view_module'), getModuleById)
  .put(auth('manage_module'), updateModule)
  .delete(auth('manage_module'), deleteModule);

// --- BATCH ROUTES ---
router.route('/batches')
  .post(auth('manage_batch'), createBatch)
  .get(auth('view_batch'), getBatches);

router.route('/batches/:id')
  .get(auth('view_batch'), getBatchById)
  .put(auth('manage_batch'), updateBatch)
  .delete(auth('manage_batch'), deleteBatch);

// --- ACADEMIC YEAR ROUTES ---
router.route('/academic-years')
  .post(auth('manage_academic_year'), createAcademicYear)
  .get(auth('view_academic_year'), getAcademicYears);

// Added missing Update/Delete/GetById routes for Academic Years
router.route('/academic-years/:id')
  .get(auth('view_academic_year'), getAcademicYearById)
  .put(auth('manage_academic_year'), updateAcademicYear)
  .delete(auth('manage_academic_year'), deleteAcademicYear);

// --- LEVEL ROUTES ---
// Note: Levels use a composite key (level_id + occupation_id), so params are :level_id/:occupation_id
router.route('/levels')
  .post(auth('manage_level'), createLevel)
  .get(auth('view_level'), getLevels);

router.route('/levels/:level_id/:occupation_id')
  .get(auth('view_level'), getLevelById)
  .put(auth('manage_level'), updateLevel)
  .delete(auth('manage_level'), deleteLevel);

// --- CURRICULUM (LEVEL MODULE) ROUTES ---
// Curriculum is usually viewed per Occupation & Level
router.get(
  '/curriculum/:occupation_id/:level_id', 
  auth('view_curriculum'), 
  getLevelModules
);

// Add a module to a level (POST to /curriculum with body)
router.post(
  '/curriculum',
  auth('manage_curriculum'),
  addModuleToLevel
);

// Remove a specific entry (uses level_module_id)
router.delete(
  '/curriculum/:id',
  auth('manage_curriculum'),
  removeModuleFromLevel
);

export default router;