import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Batch, Module } from '../academics/academic.model.js';
import { Student } from '../students/student.model.js';

export class AssessmentPlan extends Model {}
AssessmentPlan.init({
	plan_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
	batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
	module_id: { type: DataTypes.INTEGER, allowNull: false },
	total_weight: {
		type: DataTypes.DECIMAL(5, 2),
		allowNull: false,
		defaultValue: 100,
		validate: {
			isExactlyHundred(value) {
				if (Number(value) !== 100) {
					throw new Error('AssessmentPlan.total_weight must be exactly 100.');
				}
			}
		}
	}
}, {
	sequelize,
	modelName: 'assessment_plan',
	tableName: 'assessment_plans',
	timestamps: true,
	underscored: true
});

export class AssessmentTask extends Model {}
AssessmentTask.init({
	task_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
	plan_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
	task_name: { type: DataTypes.STRING(120), allowNull: false },
	task_type: {
		type: DataTypes.ENUM('EXAM', 'QUIZ', 'PROJECT', 'ASSIGNMENT', 'LAB', 'PRESENTATION', 'OTHER'),
		allowNull: false,
		defaultValue: 'OTHER'
	},
	max_weight: {
		type: DataTypes.DECIMAL(5, 2),
		allowNull: false,
		validate: {
			min: 0,
			max: 100
		}
	}
}, {
	sequelize,
	modelName: 'assessment_task',
	tableName: 'assessment_tasks',
	timestamps: true,
	underscored: true
});

export class StudentGrade extends Model {}
StudentGrade.init({
	grade_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
	student_pk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
	task_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
	batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
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
		{
			unique: true,
			fields: ['student_pk', 'task_id']
		}
	]
});

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
	note: { type: DataTypes.TEXT }
}, {
	sequelize,
	modelName: 'grade_submission',
	tableName: 'grade_submissions',
	timestamps: true,
	underscored: true,
	indexes: [
		{
			unique: true,
			fields: ['batch_id', 'module_id']
		}
	]
});

export class GradingPolicy extends Model {}
GradingPolicy.init({
	policy_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
	policy_name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
	is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
	sequelize,
	modelName: 'grading_policy',
	tableName: 'grading_policies',
	timestamps: true,
	underscored: true
});

export class GradeScaleItem extends Model {}
GradeScaleItem.init({
	scale_item_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
	policy_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
	letter_grade: { type: DataTypes.STRING(8), allowNull: false },
	min_score: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
	max_score: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
	grade_points: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
	is_pass: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
	sequelize,
	modelName: 'grade_scale_item',
	tableName: 'grade_scale_items',
	timestamps: true,
	underscored: true
});

export class ModuleEnrollment extends Model {}
ModuleEnrollment.init({
	enrollment_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
	student_pk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
	module_id: { type: DataTypes.INTEGER, allowNull: false },
	batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
	final_score: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
	letter_grade: { type: DataTypes.STRING(8), allowNull: true },
	grade_points: { type: DataTypes.DECIMAL(3, 2), allowNull: true },
	status: {
		type: DataTypes.ENUM('PASSED', 'FAILED'),
		allowNull: false,
		defaultValue: 'PASSED'
	}
}, {
	sequelize,
	modelName: 'module_enrollment',
	tableName: 'module_enrollments',
	timestamps: true,
	underscored: true,
	indexes: [
		{
			unique: true,
			fields: ['student_pk', 'module_id', 'batch_id']
		}
	]
});

Batch.hasMany(AssessmentPlan, { foreignKey: 'batch_id', as: 'assessment_plans' });
AssessmentPlan.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });

Module.hasMany(AssessmentPlan, { foreignKey: 'module_id', as: 'assessment_plans' });
AssessmentPlan.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

AssessmentPlan.hasMany(AssessmentTask, { foreignKey: 'plan_id', as: 'tasks' });
AssessmentTask.belongsTo(AssessmentPlan, { foreignKey: 'plan_id', as: 'plan' });

Student.hasMany(StudentGrade, { foreignKey: 'student_pk', as: 'grades' });
StudentGrade.belongsTo(Student, { foreignKey: 'student_pk', as: 'student' });

AssessmentTask.hasMany(StudentGrade, { foreignKey: 'task_id', as: 'grades' });
StudentGrade.belongsTo(AssessmentTask, { foreignKey: 'task_id', as: 'task' });

Batch.hasMany(StudentGrade, { foreignKey: 'batch_id', as: 'student_grades' });
StudentGrade.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });

Batch.hasMany(GradeSubmission, { foreignKey: 'batch_id', as: 'grade_submissions' });
GradeSubmission.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });

Module.hasMany(GradeSubmission, { foreignKey: 'module_id', as: 'grade_submissions' });
GradeSubmission.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

GradingPolicy.hasMany(GradeScaleItem, { foreignKey: 'policy_id', as: 'scale_items' });
GradeScaleItem.belongsTo(GradingPolicy, { foreignKey: 'policy_id', as: 'policy' });
