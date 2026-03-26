import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Student } from '../students/student.model.js';
import { Module, Batch } from '../academics/academic.model.js';
import { Instructor } from '../instructors/instructor.model.js';

// ----------------------
// MODULE OFFERING
// ----------------------
export class ModuleOffering extends Model {}

ModuleOffering.init({
  offering_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

  module_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'modules', key: 'module_id' }
  },

  batch_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'batches', key: 'batch_id' }
  },

  section_code: {
    type: DataTypes.STRING(10),
    allowNull: false
  },

  instructor_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'instructors', key: 'instructor_id' }
  },

  capacity: DataTypes.INTEGER

}, {
  sequelize,
  tableName: 'module_offerings',
  underscored: true,
  indexes: [
    { unique: true, fields: ['module_id', 'batch_id', 'section_code'] }
  ]
});

// ----------------------
// ENROLLMENT
// ----------------------
export class Enrollment extends Model {}

Enrollment.init({
  enrollment_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

  student_pk: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'students', key: 'student_pk' }
  },

  offering_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'module_offerings', key: 'offering_id' }
  },

  status: {
    type: DataTypes.ENUM('ENROLLED', 'DROPPED', 'WITHDRAWN', 'COMPLETED',"REQUESTED",'FAILED'),
    defaultValue: 'REQUESTED'
  }

}, {
  sequelize,
  tableName: 'enrollments',
  underscored: true,
  indexes: [
    { unique: true, fields: ['student_pk', 'offering_id'] }
  ]
});

// ----------------------
// ASSOCIATIONS
// ----------------------

// ModuleOffering
Module.hasMany(ModuleOffering, { foreignKey: 'module_id', as: 'offerings' });
Batch.hasMany(ModuleOffering, { foreignKey: 'batch_id', as: 'offerings' });
Instructor.hasMany(ModuleOffering, { foreignKey: 'instructor_id', as: 'offerings' });

ModuleOffering.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
ModuleOffering.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });
ModuleOffering.belongsTo(Instructor, { foreignKey: 'instructor_id', as: 'instructor' });

// Enrollment
Student.hasMany(Enrollment, { foreignKey: 'student_pk', as: 'enrollments' });
ModuleOffering.hasMany(Enrollment, { foreignKey: 'offering_id', as: 'enrollments' });

Enrollment.belongsTo(Student, { foreignKey: 'student_pk', as: 'student' });
Enrollment.belongsTo(ModuleOffering, { foreignKey: 'offering_id', as: 'offering' });