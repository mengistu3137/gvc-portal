import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Student } from '../students/student.model.js';
import { Module, Batch } from '../academics/academic.model.js';
import { ModuleEnrollment } from '../grading/grading.model.js';

export class ModulePrerequisite extends Model {}
ModulePrerequisite.init({
  prerequisite_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  module_id: { type: DataTypes.INTEGER, allowNull: false },
  required_module_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  sequelize,
  modelName: 'module_prerequisite',
  tableName: 'module_prerequisites',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['module_id', 'required_module_id'] }
  ]
});

export class Enrollment extends Model {}
Enrollment.init({
  enrollment_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  student_pk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  module_id: { type: DataTypes.INTEGER, allowNull: false },
  batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  status: {
    type: DataTypes.ENUM('ENROLLED', 'DROPPED', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'ENROLLED'
  },
  enrolled_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  dropped_at: { type: DataTypes.DATE }
}, {
  sequelize,
  modelName: 'enrollment',
  tableName: 'enrollments',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['student_pk', 'module_id', 'batch_id'] }
  ]
});

export class StudentGpaRecord extends Model {}
StudentGpaRecord.init({
  gpa_record_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  student_pk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  semester: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  semester_gpa: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 0 },
  cumulative_gpa: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 0 },
  total_credits_earned: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
  total_credits_attempted: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
  total_grade_points: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
  semester_modules: { type: DataTypes.JSON }
}, {
  sequelize,
  modelName: 'student_gpa_record',
  tableName: 'student_gpa_records',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['student_pk', 'batch_id', 'semester'] }
  ]
});

Module.hasMany(ModulePrerequisite, { foreignKey: 'module_id', as: 'prerequisites' });
ModulePrerequisite.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

Module.hasMany(ModulePrerequisite, { foreignKey: 'required_module_id', as: 'required_by' });
ModulePrerequisite.belongsTo(Module, { foreignKey: 'required_module_id', as: 'required_module' });

Student.hasMany(Enrollment, { foreignKey: 'student_pk', as: 'enrollments' });
Enrollment.belongsTo(Student, { foreignKey: 'student_pk', as: 'student' });

Module.hasMany(Enrollment, { foreignKey: 'module_id', as: 'enrollments' });
Enrollment.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

Batch.hasMany(Enrollment, { foreignKey: 'batch_id', as: 'enrollments' });
Enrollment.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });

Student.hasMany(StudentGpaRecord, { foreignKey: 'student_pk', as: 'gpa_records' });
StudentGpaRecord.belongsTo(Student, { foreignKey: 'student_pk', as: 'student' });

Batch.hasMany(StudentGpaRecord, { foreignKey: 'batch_id', as: 'gpa_records' });
StudentGpaRecord.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });

