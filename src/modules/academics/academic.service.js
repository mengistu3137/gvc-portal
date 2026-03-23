import { Op } from 'sequelize';
import { 
  Sector, Occupation, Level, 
  Module, AcademicYear, Batch, LevelModule
} from './academic.model.js';

class AcademicService {
  
  // --- SECTOR CRUD ---
  async createSector(data) {
    return await Sector.create(data);
  }

  async getSectors(query) {
    const { search = '' } = query;
    return await Sector.findAll({
      where: {
        [Op.or]: [
          { sector_name: { [Op.like]: `%${search}%` } },
          { sector_code: { [Op.like]: `%${search}%` } }
        ]
      }
    });
  }

  async getSectorById(id) {
    return await Sector.findByPk(id);
  }

  async updateSector(id, data) {
    const sector = await Sector.findByPk(id);
    if (!sector) throw new Error('Sector not found');
    return await sector.update(data);
  }

  async deleteSector(id) {
    const sector = await Sector.findByPk(id);
    if (!sector) throw new Error('Sector not found');
    return await sector.destroy();
  }

  // --- OCCUPATION CRUD ---
  async createOccupation(data) {
    return await Occupation.create(data);
  }

  async getOccupations(query) {
    const { page = 1, limit = 10, search = '', sector_id } = query;
    const offset = (page - 1) * limit;

    const whereClause = {
      [Op.and]: [
        search ? {
          [Op.or]: [
            { occupation_name: { [Op.like]: `%${search}%` } },
            { occupation_code: { [Op.like]: `%${search}%` } }
          ]
        } : {},
        sector_id ? { sector_id } : {}
      ]
    };

    return await Occupation.findAndCountAll({
      where: whereClause,
      include: [{ model: Sector, as: 'sector' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['occupation_name', 'ASC']]
    });
  }

  async getOccupationById(id) {
    return await Occupation.findByPk(id, {
      include: [{ model: Sector, as: 'sector' }]
    });
  }

  async updateOccupation(id, data) {
    const occ = await Occupation.findByPk(id);
    if (!occ) throw new Error('Occupation not found');
    return await occ.update(data);
  }

  async deleteOccupation(id) {
    const occ = await Occupation.findByPk(id);
    if (!occ) throw new Error('Occupation not found');
    return await occ.destroy();
  }

  // --- LEVEL CRUD (Added) ---
  async createLevel(data) {
    return await Level.create(data);
  }

  async getLevels(query) {
    const { occupation_id } = query;
    return await Level.findAll({
      where: occupation_id ? { occupation_id } : {},
      include: [{ model: Occupation, as: 'occupation' }],
      order: [['level_id', 'ASC']]
    });
  }

  async getLevelById(levelId, occupationId) {
    // Composite Primary Key lookup
    return await Level.findOne({
      where: { level_id: levelId, occupation_id: occupationId },
      include: [{ model: Occupation, as: 'occupation' }]
    });
  }

  async updateLevel(levelId, occupationId, data) {
    const level = await Level.findOne({
      where: { level_id: levelId, occupation_id: occupationId }
    });
    if (!level) throw new Error('Level not found');
    return await level.update(data);
  }

  async deleteLevel(levelId, occupationId) {
    const level = await Level.findOne({
      where: { level_id: levelId, occupation_id: occupationId }
    });
    if (!level) throw new Error('Level not found');
    return await level.destroy();
  }

  // --- MODULE CRUD (Fixed to use module_id) ---
  async createModule(data) {
    return await Module.create(data);
  }

  async getModules(query) {
    const { page = 1, limit = 10, search = '', occupation_id, sortBy = 'created_at', sortOrder = 'DESC' } = query;
    const offset = (page - 1) * limit;

    const whereClause = {
      [Op.and]: [
        search ? { 
            [Op.or]: [
                { unit_competency: { [Op.like]: `%${search}%` } },
                { m_code: { [Op.like]: `%${search}%` } }
            ] 
        } : {},
        occupation_id ? { occupation_id } : {}
      ]
    };

    return await Module.findAndCountAll({
      where: whereClause,
      include: [{ model: Occupation, as: 'occupation' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
    });
  }

  async getModuleById(id) {
    return await Module.findByPk(id, {
      include: [{ model: Occupation, as: 'occupation' }]
    });
  }

  async updateModule(id, data) {
    // Changed from m_code to id (module_id)
    const mod = await Module.findByPk(id);
    if (!mod) throw new Error('Module not found');
    return await mod.update(data);
  }

  async deleteModule(id) {
    // Changed from m_code to id (module_id)
    const mod = await Module.findByPk(id);
    if (!mod) throw new Error('Module not found');
    return await mod.destroy();
  }

  // --- ACADEMIC YEAR CRUD (Added) ---
  async createAcademicYear(data) {
    return await AcademicYear.create(data);
  }

  async getAcademicYears() {
    return await AcademicYear.findAll({ 
        order: [['start_date', 'DESC']] 
    });
  }

  async getAcademicYearById(id) {
    return await AcademicYear.findByPk(id);
  }

  async updateAcademicYear(id, data) {
    const year = await AcademicYear.findByPk(id);
    if (!year) throw new Error('Academic Year not found');
    return await year.update(data);
  }

  async deleteAcademicYear(id) {
    const year = await AcademicYear.findByPk(id);
    if (!year) throw new Error('Academic Year not found');
    return await year.destroy();
  }

  // --- BATCH CRUD (Added) ---
  async createBatch(data) {
    return await Batch.create(data);
  }

  async getBatches(query) {
    const { page = 1, limit = 10, search = '', occupation_id, level_id } = query;
    
    return await Batch.findAndCountAll({
      where: {
        [Op.and]: [
          search ? { batch_code: { [Op.like]: `%${search}%` } } : {},
          occupation_id ? { occupation_id } : {},
          level_id ? { level_id } : {}
        ]
      },
      include: [
        { model: Occupation, as: 'occupation' },
        { model: Level, as: 'level' },
        { model: AcademicYear, as: 'academic_year' }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['batch_id', 'DESC']]
    });
  }

  async getBatchById(id) {
    return await Batch.findByPk(id, {
      include: [
        { model: Occupation, as: 'occupation' },
        { model: Level, as: 'level' },
        { model: AcademicYear, as: 'academic_year' }
      ]
    });
  }

  async updateBatch(id, data) {
    const batch = await Batch.findByPk(id);
    if (!batch) throw new Error('Batch not found');
    return await batch.update(data);
  }

  async deleteBatch(id) {
    const batch = await Batch.findByPk(id);
    if (!batch) throw new Error('Batch not found');
    return await batch.destroy();
  }

  // --- CURRICULUM (LEVEL MODULE) ---
  
  // Add a module to a level (Curriculum Entry)
 async addModuleToLevel(data) {
    return await LevelModule.create(data);
  }

  // Get all modules for a specific level/occupation
  async getLevelModules(occupation_id, level_id) {
    return await LevelModule.findAll({
      where: { occupation_id, level_id },
     
      include: [
        { 
            model: Module, 
          as: 'module'
        },
        { 
            model: Level, 
            as: 'level' 
        }
      ],
      order: [['semester', 'ASC']]
    });
  }

  // Remove a specific module from a level
  async removeModuleFromLevel(id) {
    const record = await LevelModule.findByPk(id);
    if (!record) throw new Error('Curriculum entry not found');
    return await record.destroy();
  }
}

export default new AcademicService();