import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * ==========================================
 * SYSTEM & RBAC MODELS
 * ==========================================
 */
class Role extends Model {}
Role.init({
  name: { type: DataTypes.STRING(30), unique: true, allowNull: false }
}, { sequelize, modelName: 'Role', tableName: 'roles', timestamps: false });

class Permission extends Model {}
Permission.init({
  key: { type: DataTypes.STRING(50), unique: true, allowNull: false }
}, { sequelize, modelName: 'Permission', tableName: 'permissions', timestamps: false });

class User extends Model {}
User.init({
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(100), unique: true, validate: { isEmail: true } },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'User', tableName: 'users', paranoid: true });

/**
 * ==========================================
 * ACADEMIC HIERARCHY MODELS
 * ==========================================
 */
class Department extends Model {}
Department.init({
  name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  code: { type: DataTypes.STRING(10), unique: true, allowNull: false }
}, { sequelize, modelName: 'Department', tableName: 'departments' });

class Program extends Model {}
Program.init({
  name: { type: DataTypes.STRING(100), allowNull: false },
  type: { type: DataTypes.ENUM('Regular', 'Extension', 'Short-Term'), defaultValue: 'Regular' },
  total_levels: { type: DataTypes.TINYINT, validate: { min: 1, max: 5 } }
}, { sequelize, modelName: 'Program', tableName: 'programs' });

class AcademicYear extends Model {}
AcademicYear.init({
  id: { type: DataTypes.INTEGER, primary_key: true }, // e.g. 2015
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { sequelize, modelName: 'AcademicYear', tableName: 'academic_years', timestamps: false });

class Batch extends Model {}
Batch.init({
  level_id: { type: DataTypes.TINYINT, allowNull: false },
  batch_name: { type: DataTypes.STRING(50) }
}, { 
  sequelize, 
  modelName: 'Batch', 
  tableName: 'batches',
  indexes: [{ unique: true, fields: ['program_id', 'academic_year_id', 'level_id'] }] 
});

/**
 * ==========================================
 * TVET CURRICULUM MODELS
 * ==========================================
 */
class Module extends Model {}
Module.init({
  m_code: { type: DataTypes.STRING(20), primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  theory_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
  practical_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
  coop_team_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
  coop_apprentice_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_common: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { 
  sequelize, 
  modelName: 'Module', 
  tableName: 'modules',
  getterMethods: {
    total_hours() {
      return this.theory_hours + this.practical_hours + this.coop_team_hours + this.coop_apprentice_hours;
    }
  }
});

class CurriculumMapping extends Model {}
CurriculumMapping.init({
  version_tag: { type: DataTypes.STRING(10), defaultValue: 'V1' },
  level_id: { type: DataTypes.TINYINT, allowNull: false }
}, { 
  sequelize, 
  modelName: 'CurriculumMapping', 
  tableName: 'curriculum_mappings',
  indexes: [{ unique: true, fields: ['program_id', 'level_id', 'module_m_code', 'version_tag'] }]
});

/**
 * ==========================================
 * STUDENT & ENROLLMENT MODELS
 * ==========================================
 */
class StudentSequence extends Model {}
StudentSequence.init({
  year: { type: DataTypes.INTEGER, primaryKey: true },
  last_value: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { sequelize, modelName: 'StudentSequence', tableName: 'student_sequences', timestamps: false });

class Student extends Model {}
Student.init({
  student_id: { type: DataTypes.STRING(20), primaryKey: true },
  full_name: { type: DataTypes.STRING(150), allowNull: false },
  gender: { type: DataTypes.ENUM('M', 'F'), allowNull: false },
  phone_number: { type: DataTypes.STRING(15), unique: true },
  educational_stream: { type: DataTypes.ENUM('Social', 'Natural', 'Bsc', 'Diploma'), allowNull: false },
  status: { type: DataTypes.ENUM('Active', 'Leave', 'Graduated', 'Dropped'), defaultValue: 'Active' }
}, { 
  sequelize, 
  modelName: 'Student', 
  tableName: 'students',
  paranoid: true,
  hooks: {
    beforeCreate: async (student, options) => {
      const currentYear = new Date().getFullYear();
      const [seq] = await StudentSequence.findOrCreate({
        where: { year: currentYear },
        defaults: { last_value: 0 },
        transaction: options.transaction,
        lock: options.transaction.LOCK.UPDATE
      });
      const nextVal = seq.last_value + 1;
      await seq.update({ last_value: nextVal }, { transaction: options.transaction });
      student.student_id = `GVCHNSR${nextVal.toString().padStart(4, '0')}/${currentYear.toString().slice(-2)}`;
    }
  }
});

class Enrollment extends Model {}
Enrollment.init({
  status: { type: DataTypes.ENUM('Enrolled', 'Completed', 'Dropped', 'Repeated'), defaultValue: 'Enrolled' }
}, { 
  sequelize, 
  modelName: 'Enrollment', 
  tableName: 'enrollments',
  indexes: [{ unique: true, fields: ['student_id', 'batch_id'] }]
});

/**
 * ==========================================
 * GRADING & FINANCE MODELS
 * ==========================================
 */
class GradeScale extends Model {}
GradeScale.init({
  min_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  max_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  letter_grade: { type: DataTypes.STRING(2), allowNull: false },
  grade_point: { type: DataTypes.DECIMAL(3, 2), allowNull: false }
}, { sequelize, modelName: 'GradeScale', tableName: 'grade_scales', timestamps: false });

class Grade extends Model {}
Grade.init({
  assessment_percentage: { type: DataTypes.DECIMAL(5, 2), validate: { min: 0, max: 100 } },
  letter_grade: { type: DataTypes.STRING(2) },
  grade_point: { type: DataTypes.DECIMAL(3, 2) },
  approval_status: { 
    type: DataTypes.ENUM('Draft', 'Instructor_Submitted', 'HOD_Approved', 'Registrar_Finalized'),
    defaultValue: 'Draft' 
  }
}, { sequelize, modelName: 'Grade', tableName: 'grades' });

class Invoice extends Model {}
Invoice.init({
  amount_due: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('Unpaid', 'Partially_Paid', 'Paid', 'Cancelled'), defaultValue: 'Unpaid' }
}, { sequelize, modelName: 'Invoice', tableName: 'invoices' });

class Payment extends Model {}
Payment.init({
  amount_paid: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  transaction_ref: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  payment_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'Payment', tableName: 'payments' });

/**
 * ==========================================
 * ASSOCIATIONS (RELATIONSHIPS)
 * ==========================================
 */

// RBAC
Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id' });
Role.belongsToMany(Permission, { through: 'role_permissions', timestamps: false });
Permission.belongsToMany(Role, { through: 'role_permissions', timestamps: false });

// Academics
Department.hasMany(Program, { foreignKey: 'department_id' });
Program.belongsTo(Department, { foreignKey: 'department_id' });
Program.hasMany(Batch, { foreignKey: 'program_id' });
Batch.belongsTo(Program, { foreignKey: 'program_id' });
AcademicYear.hasMany(Batch, { foreignKey: 'academic_year_id' });
Batch.belongsTo(AcademicYear, { foreignKey: 'academic_year_id' });

// Curriculum
Program.hasMany(CurriculumMapping, { foreignKey: 'program_id' });
Module.hasMany(CurriculumMapping, { foreignKey: 'module_m_code' });
CurriculumMapping.belongsTo(Program, { foreignKey: 'program_id' });
CurriculumMapping.belongsTo(Module, { foreignKey: 'module_m_code' });

// Student & Academics
Student.hasMany(Enrollment, { foreignKey: 'student_id' });
Batch.hasMany(Enrollment, { foreignKey: 'batch_id' });
Enrollment.belongsTo(Student, { foreignKey: 'student_id' });
Enrollment.belongsTo(Batch, { foreignKey: 'batch_id' });

Student.hasMany(Grade, { foreignKey: 'student_id' });
Module.hasMany(Grade, { foreignKey: 'module_m_code' });
Batch.hasMany(Grade, { foreignKey: 'batch_id' });
Grade.belongsTo(Student, { foreignKey: 'student_id' });
Grade.belongsTo(Module, { foreignKey: 'module_m_code' });
Grade.belongsTo(Batch, { foreignKey: 'batch_id' });

// Finance
Student.hasMany(Invoice, { foreignKey: 'student_id' });
Batch.hasMany(Invoice, { foreignKey: 'batch_id' });
Invoice.belongsTo(Student, { foreignKey: 'student_id' });
Invoice.belongsTo(Batch, { foreignKey: 'batch_id' });
Invoice.hasMany(Payment, { foreignKey: 'invoice_id' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id' });

export {
  Role, Permission, User,
  Department, Program, AcademicYear, Batch,
  Module, CurriculumMapping,
  Student, StudentSequence, Enrollment,
  GradeScale, Grade,
  Invoice, Payment
};

export default sequelize;