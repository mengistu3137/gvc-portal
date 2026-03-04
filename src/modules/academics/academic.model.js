import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

export class Department extends Model {}
Department.init({
  department_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  department_code: { type: DataTypes.STRING(20), unique: true, allowNull: false },
  department_name: { type: DataTypes.STRING(150), allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'department', paranoid: true });

export class Program extends Model {}
Program.init({
  program_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  program_code: { type: DataTypes.STRING(30), unique: true, allowNull: false },
  program_name: { type: DataTypes.STRING(180), allowNull: false },
  track_type: { type: DataTypes.ENUM('REGULAR'), defaultValue: 'REGULAR' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'program', paranoid: true });

export class Level extends Model {}
Level.init({
  level_id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true },
  level_name: { type: DataTypes.ENUM('I', 'II', 'III', 'IV'), allowNull: false },
  sort_order: { type: DataTypes.TINYINT.UNSIGNED, unique: true }
}, { sequelize, modelName: 'level', timestamps: false });

export class AcademicYear extends Model {}
AcademicYear.init({
  academic_year_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  academic_year_label: { type: DataTypes.STRING(20), unique: true, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'academic_year', timestamps: false });

export class Batch extends Model {}
Batch.init({
  batch_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  batch_code: { type: DataTypes.STRING(40), unique: true, allowNull: false },
  intake_term: { type: DataTypes.STRING(20), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  capacity: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 }
}, { sequelize, modelName: 'batch' });

// Define Associations
Department.hasMany(Program, { foreignKey: 'department_id' });
Program.belongsTo(Department, { foreignKey: 'department_id' });

Program.hasMany(Batch, { foreignKey: 'program_id' });
Batch.belongsTo(Program, { foreignKey: 'program_id' });

Level.hasMany(Batch, { foreignKey: 'level_id' });
Batch.belongsTo(Level, { foreignKey: 'level_id' });

AcademicYear.hasMany(Batch, { foreignKey: 'academic_year_id' });
Batch.belongsTo(AcademicYear, { foreignKey: 'academic_year_id' });