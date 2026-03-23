import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Batch, Module } from '../academics/academic.model.js';
import { Student } from '../students/student.model.js';

// ==========================================
// 1. ASSESSMENT TASK
// (Replaces the Plan. Now tasks link directly to Batch & Module)
// ==========================================
export class AssessmentTask extends Model {}
AssessmentTask.init({
    task_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    module_id: { type: DataTypes.INTEGER, allowNull: false },
    task_name: { type: DataTypes.STRING(120), allowNull: false },
    task_type: { 
        type: DataTypes.ENUM('EXAM', 'QUIZ', 'PROJECT', 'ASSIGNMENT', 'LAB', 'PRESENTATION', 'OTHER'), 
        allowNull: false 
    },
    max_weight: { 
        type: DataTypes.DECIMAL(5, 2), 
        allowNull: false,
        validate: { min: 0, max: 100 }
    }
}, { 
    sequelize, 
    modelName: 'assessment_task', 
    tableName: 'assessment_tasks',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['batch_id', 'module_id'] }] 
});

// ==========================================
// 2. STUDENT GRADE
// (Stores actual marks for a specific Task)
// ==========================================
export class StudentGrade extends Model {}
StudentGrade.init({
    grade_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    student_pk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    task_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    obtained_score: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        validate: { min: 0 }
    }
}, {
    sequelize,
    modelName: 'student_grade',
    tableName: 'student_grades',
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ['student_pk', 'task_id'] }
    ]
});

// ==========================================
// 3. GRADE SUBMISSION
// (Tracks the Workflow Status of a Module in a Batch)
// ==========================================
export class GradeSubmission extends Model {}
GradeSubmission.init({
    submission_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    module_id: { type: DataTypes.INTEGER, allowNull: false },
    status: {
        type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'REJECTED', 'HOD_APPROVED', 'QA_APPROVED', 'TVET_APPROVED', 'FINALIZED'),
        allowNull: false,
        defaultValue: 'DRAFT'
    },
    note: { type: DataTypes.TEXT } // Stores JSON history or strings
}, {
    sequelize,
    modelName: 'grade_submission',
    tableName: 'grade_submissions',
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['batch_id', 'module_id'] }]
});

// ==========================================
// 4. GRADING POLICY & SCALE
// (Defines A, B, C range per Batch)
// ==========================================
export class GradingPolicy extends Model {}
GradingPolicy.init({
    policy_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    policy_name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { sequelize, modelName: 'grading_policy', tableName: 'grading_policies', underscored: true });

export class GradeScaleItem extends Model {}
GradeScaleItem.init({
    scale_item_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    policy_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    letter_grade: { type: DataTypes.STRING(8), allowNull: false },
    min_score: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
    max_score: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
    grade_points: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
    is_pass: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { sequelize, modelName: 'grade_scale_item', tableName: 'grade_scale_items', underscored: true });

// ==========================================
// 5. MODULE ENROLLMENT
// (The Final Outcome / Transcript record)
// ==========================================
export class ModuleEnrollment extends Model {}
ModuleEnrollment.init({
    enrollment_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    student_pk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    module_id: { type: DataTypes.INTEGER, allowNull: false },
    batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    final_score: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    letter_grade: { type: DataTypes.STRING(8), allowNull: true },
    grade_points: { type: DataTypes.DECIMAL(3, 2), allowNull: true },
    status: { type: DataTypes.ENUM('PASSED', 'FAILED'), allowNull: false, defaultValue: 'PASSED' }
}, {
    sequelize,
    modelName: 'module_enrollment',
    tableName: 'module_enrollments',
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['student_pk', 'module_id', 'batch_id'] }]
});

// ==========================================
// 6. AUDIT LOG
// ==========================================
export class GradingAuditLog extends Model {}
GradingAuditLog.init({
    log_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    submission_id: { type: DataTypes.BIGINT.UNSIGNED },
    actor_id: { type: DataTypes.BIGINT.UNSIGNED }, // The User ID who made the change
    action: { type: DataTypes.STRING(50) }, 
    from_status: { type: DataTypes.STRING(20) },
    to_status: { type: DataTypes.STRING(20) },
    note: { type: DataTypes.TEXT }
}, { sequelize, modelName: 'grading_audit_log', underscored: true });

// ==========================================
// ASSOCIATIONS
// ==========================================

// AssessmentTask Links
Batch.hasMany(AssessmentTask, { foreignKey: 'batch_id', as: 'tasks' });
Module.hasMany(AssessmentTask, { foreignKey: 'module_id', as: 'tasks' });
AssessmentTask.belongsTo(Batch, { foreignKey: 'batch_id' });
AssessmentTask.belongsTo(Module, { foreignKey: 'module_id' });

// StudentGrade Links
AssessmentTask.hasMany(StudentGrade, { foreignKey: 'task_id', as: 'grades' });
StudentGrade.belongsTo(AssessmentTask, { foreignKey: 'task_id', as: 'task' });
StudentGrade.belongsTo(Student, { foreignKey: 'student_pk', as: 'student' });

// Submission Links
Batch.hasMany(GradeSubmission, { foreignKey: 'batch_id' });
Module.hasMany(GradeSubmission, { foreignKey: 'module_id' });
GradeSubmission.belongsTo(Batch, { foreignKey: 'batch_id' });
GradeSubmission.belongsTo(Module, { foreignKey: 'module_id' });

// Policy Links
GradingPolicy.hasMany(GradeScaleItem, { foreignKey: 'policy_id', as: 'scale_items' });
GradeScaleItem.belongsTo(GradingPolicy, { foreignKey: 'policy_id', as: 'policy' });

// Enrollment Links
Student.hasMany(ModuleEnrollment, { foreignKey: 'student_pk', as: 'enrollments' });
ModuleEnrollment.belongsTo(Student, { foreignKey: 'student_pk', as: 'student' });
ModuleEnrollment.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
ModuleEnrollment.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });

// Audit Links
GradeSubmission.hasMany(GradingAuditLog, { foreignKey: 'submission_id', as: 'logs' });
GradingAuditLog.belongsTo(GradeSubmission, { foreignKey: 'submission_id' });