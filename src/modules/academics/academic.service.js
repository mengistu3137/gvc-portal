import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { 
  Sector, Occupation, Level, 
  Module, AcademicYear, Batch, LevelModule
} from './academic.model.js';

/**
 * Data Transfer Object Helper
 * Ensures consistent API response structure, especially for virtual fields.
 */
const toModuleDto = (module) => {
  const plain = module.get({ plain: true });
  return {
    ...plain,
    // Ensure virtual fields are calculated and exposed
    total_hours: plain.theory_hours + plain.practical_hours + plain.cooperative_hours
  };
};

class AcademicService {

  // --- SECTOR CRUD ---
  async createSector(data) {
    const t = await sequelize.transaction();
    try {
      const sector = await Sector.create(data, { transaction: t });
      await t.commit();
      return sector;
    } catch (error) {
      await t.rollback();
      throw error;
    }
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
    const t = await sequelize.transaction();
    try {
      const sector = await Sector.findByPk(id, { transaction: t });
      if (!sector) throw new Error('Sector not found');
      await sector.update(data, { transaction: t });
      await t.commit();
      return await this.getSectorById(id); // Return updated data
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deleteSector(id) {
    const t = await sequelize.transaction();
    try {
      const sector = await Sector.findByPk(id, { transaction: t });
      if (!sector) throw new Error('Sector not found');
      await sector.destroy({ transaction: t });
      await t.commit();
      return { message: 'Sector deleted successfully' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // --- OCCUPATION CRUD ---
  async createOccupation(data) {
    const t = await sequelize.transaction();
    try {
      const occupation = await Occupation.create(data, { transaction: t });
      await t.commit();
      return occupation;
    } catch (error) {
      await t.rollback();
      throw error;
    }
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
      order: [['occupation_name', 'ASC']],
      distinct: true
    });
  }

  async getOccupationById(id) {
    return await Occupation.findByPk(id, {
      include: [{ model: Sector, as: 'sector' }]
    });
  }

  async updateOccupation(id, data) {
    const t = await sequelize.transaction();
    try {
      const occ = await Occupation.findByPk(id, { transaction: t });
      if (!occ) throw new Error('Occupation not found');
      await occ.update(data, { transaction: t });
      await t.commit();
      return this.getOccupationById(id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deleteOccupation(id) {
    const t = await sequelize.transaction();
    try {
      const occ = await Occupation.findByPk(id, { transaction: t });
      if (!occ) throw new Error('Occupation not found');
      await occ.destroy({ transaction: t });
      await t.commit();
      return { message: 'Occupation deleted successfully' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // --- LEVEL CRUD ---
  async createLevel(data) {
    const t = await sequelize.transaction();
    try {
      const level = await Level.create(data, { transaction: t });
      await t.commit();
      return level;
    } catch (error) {
      await t.rollback();
      throw error;
    }
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
    return await Level.findOne({
      where: { level_id: levelId, occupation_id: occupationId },
      include: [{ model: Occupation, as: 'occupation' }]
    });
  }

  async updateLevel(levelId, occupationId, data) {
    const t = await sequelize.transaction();
    try {
      const level = await Level.findOne({
        where: { level_id: levelId, occupation_id: occupationId },
        transaction: t
      });
      if (!level) throw new Error('Level not found');
      await level.update(data, { transaction: t });
      await t.commit();
      return this.getLevelById(levelId, occupationId);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deleteLevel(levelId, occupationId) {
    const t = await sequelize.transaction();
    try {
      const level = await Level.findOne({
        where: { level_id: levelId, occupation_id: occupationId },
        transaction: t
      });
      if (!level) throw new Error('Level not found');
      await level.destroy({ transaction: t });
      await t.commit();
      return { message: 'Level deleted successfully' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // --- MODULE CRUD (REFACTORED) ---

  /**
   * Creates a new Module with validation and transaction safety.
   */
  async createModule(data) {
    // 1. Validation
    if (!data.m_code) throw new Error('Module code is required');
    if (!data.occupation_id) throw new Error('Occupation ID is required');
    if (!data.unit_competency) throw new Error('Unit competency is required');

    // 2. Numeric Validation
    const theory = parseInt(data.theory_hours || 0, 10);
    const practical = parseInt(data.practical_hours || 0, 10);
    const cooperative = parseInt(data.cooperative_hours || 0, 10);
    
    if (theory < 0 || practical < 0 || cooperative < 0) {
      throw new Error('Hours cannot be negative');
    }
    
    if (parseFloat(data.credit_units) < 0) {
      throw new Error('Credit units cannot be negative');
    }

    // 3. Uniqueness Check (Manual validation for better error messages)
    const existing = await Module.findOne({ where: { m_code: data.m_code } });
    if (existing) throw new Error(`Module with code ${data.m_code} already exists`);

    const t = await sequelize.transaction();
    try {
      const module = await Module.create({
        m_code: data.m_code,
        occupation_id: data.occupation_id,
        unit_competency: data.unit_competency,
        theory_hours: theory,
        practical_hours: practical,
        cooperative_hours: cooperative,
        learning_hours: data.learning_hours || 0,
        credit_units: data.credit_units
      }, { transaction: t });

      await t.commit();
      return toModuleDto(module);
    } catch (error) {
      await t.rollback();
      // Catch Unique Constraint from DB just in case the manual check missed it (race condition)
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Module code must be unique');
      }
      throw error;
    }
  }

  async getModules(query) {
    const { page = 1, limit = 10, search = '', occupation_id } = query;
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

    const result = await Module.findAndCountAll({
      where: whereClause,
      include: [{ model: Occupation, as: 'occupation' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['m_code', 'ASC']],
      distinct: true
    });

    return {
      count: result.count,
      rows: result.rows.map(toModuleDto)
    };
  }

  async getModuleById(id) {
    const module = await Module.findByPk(id, {
      include: [{ model: Occupation, as: 'occupation' }]
    });
    if (!module) throw new Error('Module not found');
    return toModuleDto(module);
  }

  async updateModule(id, data) {
    // Pre-validation for updates
    if (data.m_code) {
      const existing = await Module.findOne({ 
        where: { m_code: data.m_code },
        // Exclude current module from uniqueness check
        ...((id && { [Op.not]: { module_id: id }}) || {}) 
      });
      if (existing) throw new Error('Module code already in use');
    }

    const t = await sequelize.transaction();
    try {
      const mod = await Module.findByPk(id, { transaction: t });
      if (!mod) throw new Error('Module not found');
      
      // Sanitize numeric fields
      if (data.theory_hours !== undefined) data.theory_hours = parseInt(data.theory_hours, 10);
      if (data.practical_hours !== undefined) data.practical_hours = parseInt(data.practical_hours, 10);
      if (data.cooperative_hours !== undefined) data.cooperative_hours = parseInt(data.cooperative_hours, 10);

      await mod.update(data, { transaction: t });
      await t.commit();
      return this.getModuleById(id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deleteModule(id) {
    const t = await sequelize.transaction();
    try {
      const mod = await Module.findByPk(id, { transaction: t });
      if (!mod) throw new Error('Module not found');
      
      // Note: We use paranoid: true in the model, so this soft deletes.
      // If hard delete is needed, use force: true
      await mod.destroy({ transaction: t });
      
      await t.commit();
      return { message: 'Module deleted successfully' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // --- ACADEMIC YEAR CRUD ---
  async createAcademicYear(data) {
    const t = await sequelize.transaction();
    try {
      const year = await AcademicYear.create(data, { transaction: t });
      await t.commit();
      return year;
    } catch (error) {
      await t.rollback();
      throw error;
    }
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
    const t = await sequelize.transaction();
    try {
      const year = await AcademicYear.findByPk(id, { transaction: t });
      if (!year) throw new Error('Academic Year not found');
      await year.update(data, { transaction: t });
      await t.commit();
      return this.getAcademicYearById(id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deleteAcademicYear(id) {
    const t = await sequelize.transaction();
    try {
      const year = await AcademicYear.findByPk(id, { transaction: t });
      if (!year) throw new Error('Academic Year not found');
      await year.destroy({ transaction: t });
      await t.commit();
      return { message: 'Academic Year deleted successfully' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // --- BATCH CRUD ---
  async createBatch(data) {
    const t = await sequelize.transaction();
    try {
      // The model hook `beforeValidate` will generate the batch_code automatically
      const batch = await Batch.create(data, { transaction: t });
      await t.commit();
      return batch;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

   async getBatches(query) {
    const { page = 1, limit = 10, search = '', occupation_id, level_id } = query;
    const offset = (page - 1) * limit;
    
    return await Batch.findAndCountAll({
      where: {
        [Op.and]: [
          search ? { batch_code: { [Op.like]: `%${search}%` } } : {},
          occupation_id ? { occupation_id } : {},
          level_id ? { level_id } : {}
        ]
      },
      include: [
        { 
          model: Occupation, 
          as: 'occupation',
          attributes: ['occupation_id', 'occupation_name', 'occupation_code']
        },
        { 
          model: Level, 
          as: 'level',
          // ✅ THE FIX: Filter the joined Level table by occupation_id
          where: occupation_id ? { occupation_id } : undefined, 
          attributes: ['level_id', 'level_name'],
          required: false // If a level is deleted or missing, still return the batch
        },
        { 
          model: AcademicYear, 
          as: 'academic_year',
          attributes: ['academic_year_id', 'academic_year_label', 'start_date', 'end_date']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['batch_id', 'DESC']],
      distinct: true
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
    const t = await sequelize.transaction();
    try {
      const batch = await Batch.findByPk(id, { transaction: t });
      if (!batch) throw new Error('Batch not found');
      await batch.update(data, { transaction: t });
      await t.commit();
      return this.getBatchById(id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deleteBatch(id) {
    const t = await sequelize.transaction();
    try {
      const batch = await Batch.findByPk(id, { transaction: t });
      if (!batch) throw new Error('Batch not found');
      await batch.destroy({ transaction: t });
      await t.commit();
      return { message: 'Batch deleted successfully' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // --- CURRICULUM (LEVEL MODULE) ---
  
  async addModuleToLevel(data) {
    // Validation: Check if this combination already exists
    const existing = await LevelModule.findOne({
      where: {
        occupation_id: data.occupation_id,
        level_id: data.level_id,
        m_code: data.m_code
      }
    });

    if (existing) throw new Error('This module is already added to this level.');

    const t = await sequelize.transaction();
    try {
      const link = await LevelModule.create(data, { transaction: t });
      await t.commit();
      return link;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

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
          as: 'level',
         where: { occupation_id },   
        required: false
        }
      ],
      order: [['m_code', 'ASC']]
    });
  }

  async removeModuleFromLevel(id) {
    const t = await sequelize.transaction();
    try {
      const record = await LevelModule.findByPk(id, { transaction: t });
      if (!record) throw new Error('Curriculum entry not found');
      await record.destroy({ transaction: t });
      await t.commit();
      return { message: 'Module removed from curriculum' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export default new AcademicService();