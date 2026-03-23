import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Batch, Module } from '../academics/academic.model.js';
import { Student } from '../students/student.model.js';
import { Instructor } from '../instructors/instructor.model.js';

// Grading policy stores grade scale JSON directly
export class GradingPolicy extends Model {}
GradingPolicy.init({
  policy_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  policy_name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  grade_scale: { type: DataTypes.JSON, allowNull: false }
}, {
  sequelize,
  modelName: 'grading_policy',
  tableName: 'grading_policies',
  timestamps: true,
  underscored: true
});

export class StudentGrade extends Model {}
StudentGrade.init({
  grade_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  student_pk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  module_id: { type: DataTypes.INTEGER, allowNull: false },
  batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  assessment_scores: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  total_score: { type: DataTypes.DECIMAL(6, 2) },
  final_score: { type: DataTypes.DECIMAL(6, 2) },
  letter_grade: { type: DataTypes.STRING(8) },
  grade_points: { type: DataTypes.DECIMAL(3, 2) },
  status: { type: DataTypes.ENUM('PASSED', 'FAILED', 'PENDING'), defaultValue: 'PENDING' },
  submitted_by: { type: DataTypes.BIGINT.UNSIGNED },
  submitted_at: { type: DataTypes.DATE },
  approved_by: { type: DataTypes.BIGINT.UNSIGNED },
  approved_at: { type: DataTypes.DATE }
}, {
  sequelize,
  modelName: 'student_grade',
  tableName: 'student_grades',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['student_pk', 'module_id', 'batch_id'] },
    { fields: ['final_score'] },
    { fields: ['status'] }
  ]
});

export class GradeSubmission extends Model {}
GradeSubmission.init({
  submission_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  module_id: { type: DataTypes.INTEGER, allowNull: false },
  instructor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'REJECTED', 'HOD_APPROVED', 'QA_APPROVED', 'TVET_APPROVED', 'FINALIZED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  submission_data: { type: DataTypes.JSON },
  note: { type: DataTypes.TEXT },
  review_comments: { type: DataTypes.JSON },
  submitted_at: { type: DataTypes.DATE },
  hod_approved_at: { type: DataTypes.DATE },
  qa_approved_at: { type: DataTypes.DATE },
  tvet_approved_at: { type: DataTypes.DATE },
  finalized_at: { type: DataTypes.DATE }
}, {
  sequelize,
  modelName: 'grade_submission',
  tableName: 'grade_submissions',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['batch_id', 'module_id'] },
    { fields: ['status'] }
  ]
});

export class ModuleEnrollment extends Model {}
ModuleEnrollment.init({
  enrollment_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  student_pk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  module_id: { type: DataTypes.INTEGER, allowNull: false },
  batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  final_score: { type: DataTypes.DECIMAL(6, 2) },
  letter_grade: { type: DataTypes.STRING(8) },
  grade_points: { type: DataTypes.DECIMAL(3, 2) },
  credits_earned: { type: DataTypes.DECIMAL(5, 2) },
  status: {
    type: DataTypes.ENUM('PASSED', 'FAILED', 'IN_PROGRESS'),
    allowNull: false,
    defaultValue: 'IN_PROGRESS'
  },
  completed_at: { type: DataTypes.DATE }
}, {
  sequelize,
  modelName: 'module_enrollment',
  tableName: 'module_enrollments',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['student_pk', 'module_id', 'batch_id'] },
    { fields: ['status'] },
    { fields: ['letter_grade'] }
  ]
});

// --- Associations ---
Student.hasMany(StudentGrade, { foreignKey: 'student_pk', as: 'grades' });
StudentGrade.belongsTo(Student, { foreignKey: 'student_pk', as: 'student' });

Module.hasMany(StudentGrade, { foreignKey: 'module_id', as: 'student_grades' });
StudentGrade.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

Batch.hasMany(StudentGrade, { foreignKey: 'batch_id', as: 'student_grades' });
StudentGrade.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });

Instructor.hasMany(StudentGrade, { foreignKey: 'submitted_by', as: 'submitted_grades' });
StudentGrade.belongsTo(Instructor, { foreignKey: 'submitted_by', as: 'submittedBy' });
Instructor.hasMany(StudentGrade, { foreignKey: 'approved_by', as: 'approved_grades' });
StudentGrade.belongsTo(Instructor, { foreignKey: 'approved_by', as: 'approvedBy' });

Batch.hasMany(GradeSubmission, { foreignKey: 'batch_id', as: 'grade_submissions' });
GradeSubmission.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });

Module.hasMany(GradeSubmission, { foreignKey: 'module_id', as: 'grade_submissions' });
GradeSubmission.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

Instructor.hasMany(GradeSubmission, { foreignKey: 'instructor_id', as: 'grade_submissions' });
GradeSubmission.belongsTo(Instructor, { foreignKey: 'instructor_id', as: 'instructor' });

Student.hasMany(ModuleEnrollment, { foreignKey: 'student_pk', as: 'module_enrollments' });
ModuleEnrollment.belongsTo(Student, { foreignKey: 'student_pk', as: 'student' });

Module.hasMany(ModuleEnrollment, { foreignKey: 'module_id', as: 'module_enrollments' });
ModuleEnrollment.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

Batch.hasMany(ModuleEnrollment, { foreignKey: 'batch_id', as: 'module_enrollments' });
ModuleEnrollment.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });
