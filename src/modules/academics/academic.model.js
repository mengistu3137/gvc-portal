import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

// 1. SECTOR
export class Sector extends Model {}
Sector.init({
  sector_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sector_code: { type: DataTypes.STRING(10), unique: true, allowNull: false },
  sector_name: { type: DataTypes.STRING(100), allowNull: false }
}, { sequelize, modelName: 'sector', timestamps: false });

// 2. OCCUPATION
export class Occupation extends Model {}
Occupation.init({
  occupation_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sector_id: { type: DataTypes.INTEGER, allowNull: false },
  occupation_code: { type: DataTypes.STRING(10), unique: true, allowNull: false },
  occupation_name: { type: DataTypes.STRING(150), allowNull: false },
 
}, { sequelize, modelName: 'occupation', timestamps: false });

// 3. LEVEL
export class Level extends Model {}
Level.init({
  level_id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true },
  occupation_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  level_name: { type: DataTypes.ENUM('I','II','III','IV','V'), allowNull: false }
}, { sequelize, modelName: 'level', timestamps: false });



// 5. MODULE (The Academic Module)
export class Module extends Model {}
Module.init({
  module_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  m_code: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  occupation_id: { type: DataTypes.INTEGER, allowNull: false },


  unit_competency: { type: DataTypes.STRING(255), allowNull: false },
  // Training hours breakdown: theory / practical and cooperative
  theory_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
  practical_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
  cooperative_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
  // Total hours (virtual — computed from breakdown, not written to DB)
  total_hours: {
    type: DataTypes.VIRTUAL(DataTypes.INTEGER, ['theory_hours', 'practical_hours', 'cooperative_hours']),
    get() {
      const a = parseInt(this.get('theory_hours') || 0, 10);
      const b = parseInt(this.get('practical_hours') || 0, 10);
      const c = parseInt(this.get('cooperative_hours') || 0, 10);
      return a + b + c;
    }
  },
  learning_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
  credit_units: { type: DataTypes.DECIMAL(5, 2), allowNull: false }
}, { 
  sequelize, modelName: 'module', paranoid: true,
  
  hooks: {}
});

// 6. ACADEMIC YEAR
export class AcademicYear extends Model {}
AcademicYear.init({
  academic_year_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  academic_year_label: { type: DataTypes.STRING(20), unique: true, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false }
}, { sequelize, modelName: 'academic_year', timestamps: false });

// 7. BATCH (Automated batch_code)
export class Batch extends Model {}
Batch.init({
  batch_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  occupation_id: { type: DataTypes.INTEGER, allowNull: false },
  academic_year_id: { type: DataTypes.INTEGER, allowNull: false },
  level_id: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  grading_policy_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    references: { model: 'grading_policies', key: 'policy_id' }
  },
  batch_code: { type: DataTypes.STRING(40), unique: true },
   track_type: { type: DataTypes.ENUM('REGULAR', 'EXTENSION'), defaultValue: 'REGULAR' },
  capacity: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { 
  sequelize, 
  modelName: 'batch',
  hooks: {
    beforeValidate: async (batch) => {
      const occ = await Occupation.findByPk(batch.occupation_id);
      const year = await AcademicYear.findByPk(batch.academic_year_id);
      if (occ && year) {
        // Generates: NUR-2015-L4
        batch.batch_code = `${occ.occupation_code}-${year.academic_year_label}-L${batch.level_id}`;
      }
    }
  }
});

export class LevelModule extends Model {}

LevelModule.init({
  level_module_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  occupation_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  level_id: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: false
  },

  m_code: {
    type: DataTypes.STRING(60),
    allowNull: false
  },

  semester: {
    type: DataTypes.TINYINT.UNSIGNED,
    defaultValue: 1
  },


}, { sequelize, modelName: 'level_module', timestamps: false });

// --- RELATIONSHIPS ---

// 1. Sector & Occupation
Sector.hasMany(Occupation, { foreignKey: 'sector_id', as: 'occupations' });
Occupation.belongsTo(Sector, { foreignKey: 'sector_id', as: 'sector' });

// 2. Occupation & Level
Occupation.hasMany(Level, { foreignKey: 'occupation_id' });
Level.belongsTo(Occupation, { foreignKey: 'occupation_id', as: 'occupation' });

// 3. Occupation & Module
Occupation.hasMany(Module, { foreignKey: 'occupation_id', as: 'modules' });
Module.belongsTo(Occupation, { foreignKey: 'occupation_id', as: 'occupation' });

// 4. Occupation & Batch
Occupation.hasMany(Batch, { foreignKey: 'occupation_id', as: 'batches' });
Batch.belongsTo(Occupation, { foreignKey: 'occupation_id', as: 'occupation' });

// 5. Level & Batch
Level.hasMany(Batch, { foreignKey: 'level_id' });
Batch.belongsTo(Level, { foreignKey: 'level_id', as: 'level' });

// 6. Academic Year & Batch
AcademicYear.hasMany(Batch, { foreignKey: 'academic_year_id' });
Batch.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academic_year' });

// --- CURRICULUM (LEVEL MODULE) RELATIONSHIPS ---
// Since LevelModule has extra fields (occupation_id, semester), 
// we treat it as a standard entity, not just a hidden 'through' table.

// LevelModule links to Module
Module.hasMany(LevelModule, { foreignKey: 'm_code', sourceKey: 'm_code', as: 'curriculum_links' });
LevelModule.belongsTo(Module, { foreignKey: 'm_code', targetKey: 'm_code', as: 'module' });

// LevelModule links to Level
Level.hasMany(LevelModule, { foreignKey: 'level_id', sourceKey: 'level_id' });
LevelModule.belongsTo(Level, { foreignKey: 'level_id', targetKey: 'level_id', as: 'level' });

// LevelModule links to Occupation
Occupation.hasMany(LevelModule, { foreignKey: 'occupation_id' });
LevelModule.belongsTo(Occupation, { foreignKey: 'occupation_id', as: 'occupation' });