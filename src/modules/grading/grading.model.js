import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Student } from '../students/student.model.js';
import { Batch, Level } from '../academics/academic.model.js';
import { Instructor } from '../instructors/instructor.model.js';
import { ModuleOffering } from '../enrollment/enrollment.model.js';

// ----------------------
// ASSESSMENT
// ----------------------
export class Assessment extends Model {}

Assessment.init({
  assessment_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

  offering_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'module_offerings', key: 'offering_id' }
  },

  name: { type: DataTypes.STRING, allowNull: false },
  weight: { type: DataTypes.DECIMAL(5, 2), allowNull: false }

}, {
  sequelize,
  tableName: 'assessments',
  underscored: true
});

// ----------------------
// STUDENT ASSESSMENT SCORE
// ----------------------
export class StudentAssessmentScore extends Model {}

StudentAssessmentScore.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

  student_pk: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'students', key: 'student_pk' }
  },

  assessment_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'assessments', key: 'assessment_id' }
  },

  score: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false
  }

}, {
  sequelize,
  tableName: 'student_assessment_scores',
  underscored: true,
  indexes: [
    { unique: true, fields: ['student_pk', 'assessment_id'] }
  ]
});

// ----------------------
// STUDENT RESULT
// ----------------------
export class StudentResult extends Model {}

StudentResult.init({
  result_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

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

  attempt_no: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },

  total_score: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
  letter_grade: { type: DataTypes.STRING(5), allowNull: false },
  grade_point: { type: DataTypes.DECIMAL(3, 2), allowNull: false },

  status: {
    type: DataTypes.ENUM('PASSED', 'FAILED'),
    allowNull: false
  }

}, {
  sequelize,
  tableName: 'student_results',
  underscored: true,
  indexes: [
    { unique: true, fields: ['student_pk', 'offering_id', 'attempt_no'] }
  ]
});

// ----------------------
// GRADE SCALE
// ----------------------
export class GradeScale extends Model {}

GradeScale.init({
  scale_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

  min_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  max_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },

  letter: { type: DataTypes.STRING(5), allowNull: false },
  grade_point: { type: DataTypes.DECIMAL(3, 2), allowNull: false },
  is_pass: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }

}, {
  sequelize,
  tableName: 'grade_scales',
  underscored: true
});

// ----------------------
// GRADE SUBMISSION
// ----------------------
export class GradeSubmission extends Model {}

GradeSubmission.init({
  submission_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

  offering_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'module_offerings', key: 'offering_id' }
  },

  instructor_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'instructors', key: 'instructor_id' }
  },

  status: {
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'),
    defaultValue: 'DRAFT'
  }

}, {
  sequelize,
  tableName: 'grade_submissions',
  underscored: true
});

// ----------------------
// SUBMISSION ITEM
// ----------------------
export class SubmissionItem extends Model {}

SubmissionItem.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

  submission_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'grade_submissions', key: 'submission_id' }
  },

  result_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'student_results', key: 'result_id' }
  }

}, {
  sequelize,
  tableName: 'submission_items',
  underscored: true
});

// ----------------------
// APPROVAL
// ----------------------
export class Approval extends Model {}

Approval.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

  submission_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'grade_submissions', key: 'submission_id' }
  },

  role: { type: DataTypes.STRING, allowNull: false },

  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING'
  },

  approved_by: DataTypes.BIGINT.UNSIGNED,
  approved_at: DataTypes.DATE

}, {
  sequelize,
  tableName: 'approvals',
  underscored: true
});

// ----------------------
// GPA RECORD
// ----------------------
export class StudentGpaRecord extends Model {}

StudentGpaRecord.init({
  gpa_record_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

  student_pk: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'students', key: 'student_pk' }
  },

  batch_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'batches', key: 'batch_id' }
  },

  level_id: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: false,
    references: { model: 'levels', key: 'level_id' }
  },

  level_gpa: { type: DataTypes.DECIMAL(4, 2), allowNull: false },
  cumulative_gpa: { type: DataTypes.DECIMAL(4, 2), allowNull: false }

}, {
  sequelize,
  tableName: 'student_gpa_records',
  underscored: true,
  indexes: [
    { unique: true, fields: ['student_pk', 'batch_id', 'level_id'] }
  ]
});

// ----------------------
// ASSOCIATIONS
// ----------------------

ModuleOffering.hasMany(Assessment, { foreignKey: 'offering_id', as: 'assessments' });
Assessment.belongsTo(ModuleOffering, { foreignKey: 'offering_id' });

Assessment.hasMany(StudentAssessmentScore, { foreignKey: 'assessment_id' });
StudentAssessmentScore.belongsTo(Assessment, { foreignKey: 'assessment_id' });

Student.hasMany(StudentAssessmentScore, { foreignKey: 'student_pk' });
StudentAssessmentScore.belongsTo(Student, { foreignKey: 'student_pk' });

Student.hasMany(StudentResult, { foreignKey: 'student_pk' });
StudentResult.belongsTo(Student, { foreignKey: 'student_pk' });

ModuleOffering.hasMany(StudentResult, { foreignKey: 'offering_id', as: 'results' });
StudentResult.belongsTo(ModuleOffering, { foreignKey: 'offering_id', as: 'module_offering' });

GradeSubmission.belongsTo(ModuleOffering, { foreignKey: 'offering_id' });
GradeSubmission.belongsTo(Instructor, { foreignKey: 'instructor_id' });

ModuleOffering.hasMany(GradeSubmission, { foreignKey: 'offering_id' });

SubmissionItem.belongsTo(GradeSubmission, { foreignKey: 'submission_id' });
SubmissionItem.belongsTo(StudentResult, { foreignKey: 'result_id' });

GradeSubmission.hasMany(SubmissionItem, { foreignKey: 'submission_id' });

Approval.belongsTo(GradeSubmission, { foreignKey: 'submission_id' });
GradeSubmission.hasMany(Approval, { foreignKey: 'submission_id' });

Student.hasMany(StudentGpaRecord, { foreignKey: 'student_pk' });
Batch.hasMany(StudentGpaRecord, { foreignKey: 'batch_id' });
Level.hasMany(StudentGpaRecord, { foreignKey: 'level_id' });

StudentGpaRecord.belongsTo(Student, { foreignKey: 'student_pk' });
StudentGpaRecord.belongsTo(Batch, { foreignKey: 'batch_id' });
StudentGpaRecord.belongsTo(Level, { foreignKey: 'level_id' });