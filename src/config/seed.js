import sequelize from '../config/database.js';
import { Sector, Occupation, Level, Module, AcademicYear, Batch, LevelModule } from './../modules/academics/academic.model.js';
import { Instructor } from '../modules/instructors/instructor.model.js';
import { Staff } from '../modules/staff/staff.model.js';
import { Student } from '../modules/students/student.model.js';
import { UserAccount, Role, Permission, UserRole, RolePermission } from '../modules/auth/auth.model.js';
import { Person } from '../modules/persons/person.model.js';
import { ModuleOffering, Enrollment } from '../modules/enrollment/enrollment.model.js';
import { Assessment, StudentAssessmentScore, StudentResult, GradeScale, GradeSubmission } from '../modules/grading/grading.model.js';
import argon2 from 'argon2';

class Seeder {
  // Helper method to upsert data without creating duplicate indexes
  async upsertData(model, data, uniqueFields, transaction) {
    const results = [];
    for (const item of data) {
      const where = {};
      for (const field of uniqueFields) {
        where[field] = item[field];
      }
      
      const [instance, created] = await model.findOrCreate({
        where,
        defaults: item,
        transaction
      });
      
      if (!created) {
        await instance.update(item, { transaction });
      }
      results.push(instance);
    }
    return results;
  }

  async seedAll() {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('🌱 Starting database seeding...');

      // ==================== 1. SEED SECTORS ====================
      console.log('📚 Seeding Sectors...');
      const sectorData = [
        { sector_code: 'LSA', sector_name: 'Labor and Skill Affairs Sector' },
        { sector_code: 'HLT', sector_name: 'Health Sector' },
        { sector_code: 'AGR', sector_name: 'Agriculture Sector' },
        { sector_code: 'ICT', sector_name: 'Information Communication Technology Sector' }
      ];
      
      const sectors = [];
      for (const data of sectorData) {
        const [sector, created] = await Sector.findOrCreate({
          where: { sector_code: data.sector_code },
          defaults: data,
          transaction
        });
        if (!created) {
          await sector.update(data, { transaction });
        }
        sectors.push(sector);
      }

      // ==================== 2. SEED OCCUPATIONS ====================
      console.log('📚 Seeding Occupations...');
      const lsaSector = sectors.find(s => s.sector_code === 'LSA');
      const hltSector = sectors.find(s => s.sector_code === 'HLT');
      const agrSector = sectors.find(s => s.sector_code === 'AGR');
      const ictSector = sectors.find(s => s.sector_code === 'ICT');

      const occupationData = [
        { sector_id: lsaSector.sector_id, occupation_code: 'ACF', occupation_name: 'Accounting and Finance' },
        { sector_id: agrSector.sector_id, occupation_code: 'ANH', occupation_name: 'Animal Health' },
        { sector_id: ictSector.sector_id, occupation_code: 'HNS', occupation_name: 'Hardware and Networking Services' },
        { sector_id: hltSector.sector_id, occupation_code: 'MLS', occupation_name: 'Medical Laboratory' },
        { sector_id: hltSector.sector_id, occupation_code: 'NUR', occupation_name: 'Nursing' },
        { sector_id: hltSector.sector_id, occupation_code: 'PHS', occupation_name: 'Pharmacy' }
      ];
      
      const occupations = [];
      for (const data of occupationData) {
        const [occupation, created] = await Occupation.findOrCreate({
          where: { occupation_code: data.occupation_code },
          defaults: data,
          transaction
        });
        if (!created) {
          await occupation.update(data, { transaction });
        }
        occupations.push(occupation);
      }

      const acfOcc = occupations.find(o => o.occupation_code === 'ACF');
      const anhOcc = occupations.find(o => o.occupation_code === 'ANH');
      const hnsOcc = occupations.find(o => o.occupation_code === 'HNS');
      const mlsOcc = occupations.find(o => o.occupation_code === 'MLS');
      const nurOcc = occupations.find(o => o.occupation_code === 'NUR');
      const phsOcc = occupations.find(o => o.occupation_code === 'PHS');

      // ==================== 3. SEED LEVELS ====================
      console.log('📚 Seeding Levels...');
      const levelData = [
        { level_id: 3, occupation_id: acfOcc.occupation_id, level_name: 'III' },
        { level_id: 4, occupation_id: acfOcc.occupation_id, level_name: 'IV' },
        { level_id: 1, occupation_id: anhOcc.occupation_id, level_name: 'I' },
        { level_id: 2, occupation_id: anhOcc.occupation_id, level_name: 'II' },
        { level_id: 3, occupation_id: anhOcc.occupation_id, level_name: 'III' },
        { level_id: 4, occupation_id: anhOcc.occupation_id, level_name: 'IV' },
        { level_id: 1, occupation_id: hnsOcc.occupation_id, level_name: 'I' },
        { level_id: 2, occupation_id: hnsOcc.occupation_id, level_name: 'II' },
        { level_id: 3, occupation_id: hnsOcc.occupation_id, level_name: 'III' },
        { level_id: 4, occupation_id: hnsOcc.occupation_id, level_name: 'IV' },
        { level_id: 3, occupation_id: mlsOcc.occupation_id, level_name: 'III' },
        { level_id: 4, occupation_id: mlsOcc.occupation_id, level_name: 'IV' },
        { level_id: 3, occupation_id: nurOcc.occupation_id, level_name: 'III' },
        { level_id: 4, occupation_id: nurOcc.occupation_id, level_name: 'IV' },
        { level_id: 3, occupation_id: phsOcc.occupation_id, level_name: 'III' },
        { level_id: 4, occupation_id: phsOcc.occupation_id, level_name: 'IV' }
      ];
      
      for (const data of levelData) {
        const [level, created] = await Level.findOrCreate({
          where: { level_id: data.level_id, occupation_id: data.occupation_id },
          defaults: data,
          transaction
        });
        if (!created) {
          await level.update(data, { transaction });
        }
      }

      // ==================== 4. SEED MODULES ====================
      console.log('📚 Seeding Modules...');
      const moduleData = [
        { m_code: 'ACF-MOD-001', occupation_id: acfOcc.occupation_id, unit_competency: 'Financial Accounting Fundamentals', theory_hours: 60, practical_hours: 40, cooperative_hours: 20, learning_hours: 120, credit_units: 6.0 },
        { m_code: 'ACF-MOD-002', occupation_id: acfOcc.occupation_id, unit_competency: 'Cost and Management Accounting', theory_hours: 50, practical_hours: 30, cooperative_hours: 20, learning_hours: 100, credit_units: 5.0 },
        { m_code: 'ANH-MOD-001', occupation_id: anhOcc.occupation_id, unit_competency: 'Animal Anatomy and Physiology', theory_hours: 70, practical_hours: 50, cooperative_hours: 30, learning_hours: 150, credit_units: 7.5 },
        { m_code: 'ANH-MOD-002', occupation_id: anhOcc.occupation_id, unit_competency: 'Veterinary Pharmacology', theory_hours: 60, practical_hours: 40, cooperative_hours: 20, learning_hours: 120, credit_units: 6.0 },
        { m_code: 'HNS-MOD-001', occupation_id: hnsOcc.occupation_id, unit_competency: 'Computer Hardware Fundamentals', theory_hours: 40, practical_hours: 80, cooperative_hours: 30, learning_hours: 150, credit_units: 7.5 },
        { m_code: 'HNS-MOD-002', occupation_id: hnsOcc.occupation_id, unit_competency: 'Network Configuration and Management', theory_hours: 50, practical_hours: 70, cooperative_hours: 30, learning_hours: 150, credit_units: 7.5 },
        { m_code: 'MLS-MOD-001', occupation_id: mlsOcc.occupation_id, unit_competency: 'Clinical Chemistry', theory_hours: 80, practical_hours: 100, cooperative_hours: 40, learning_hours: 220, credit_units: 11.0 },
        { m_code: 'MLS-MOD-002', occupation_id: mlsOcc.occupation_id, unit_competency: 'Hematology and Blood Banking', theory_hours: 70, practical_hours: 90, cooperative_hours: 40, learning_hours: 200, credit_units: 10.0 },
        { m_code: 'NUR-MOD-001', occupation_id: nurOcc.occupation_id, unit_competency: 'Fundamentals of Nursing', theory_hours: 80, practical_hours: 120, cooperative_hours: 40, learning_hours: 240, credit_units: 12.0 },
        { m_code: 'NUR-MOD-002', occupation_id: nurOcc.occupation_id, unit_competency: 'Medical-Surgical Nursing', theory_hours: 90, practical_hours: 130, cooperative_hours: 50, learning_hours: 270, credit_units: 13.5 },
        { m_code: 'NUR-MOD-003', occupation_id: nurOcc.occupation_id, unit_competency: 'Maternal and Child Health', theory_hours: 70, practical_hours: 100, cooperative_hours: 40, learning_hours: 210, credit_units: 10.5 },
        { m_code: 'PHS-MOD-001', occupation_id: phsOcc.occupation_id, unit_competency: 'Pharmacology and Therapeutics', theory_hours: 100, practical_hours: 60, cooperative_hours: 40, learning_hours: 200, credit_units: 10.0 },
        { m_code: 'PHS-MOD-002', occupation_id: phsOcc.occupation_id, unit_competency: 'Pharmacy Practice and Ethics', theory_hours: 80, practical_hours: 70, cooperative_hours: 30, learning_hours: 180, credit_units: 9.0 }
      ];
      
      const modules = [];
      for (const data of moduleData) {
        const [module, created] = await Module.findOrCreate({
          where: { m_code: data.m_code },
          defaults: data,
          transaction
        });
        if (!created) {
          await module.update(data, { transaction });
        }
        modules.push(module);
      }

      // ==================== 5. SEED CURRICULUM ====================
      console.log('📚 Seeding Curriculum...');
      const curriculumData = [
        { occupation_id: acfOcc.occupation_id, level_id: 3, m_code: 'ACF-MOD-001' },
        { occupation_id: acfOcc.occupation_id, level_id: 3, m_code: 'ACF-MOD-002' },
        { occupation_id: acfOcc.occupation_id, level_id: 4, m_code: 'ACF-MOD-001' },
        { occupation_id: acfOcc.occupation_id, level_id: 4, m_code: 'ACF-MOD-002' },
        { occupation_id: anhOcc.occupation_id, level_id: 1, m_code: 'ANH-MOD-001' },
        { occupation_id: anhOcc.occupation_id, level_id: 2, m_code: 'ANH-MOD-001' },
        { occupation_id: anhOcc.occupation_id, level_id: 2, m_code: 'ANH-MOD-002' },
        { occupation_id: anhOcc.occupation_id, level_id: 3, m_code: 'ANH-MOD-001' },
        { occupation_id: anhOcc.occupation_id, level_id: 3, m_code: 'ANH-MOD-002' },
        { occupation_id: anhOcc.occupation_id, level_id: 4, m_code: 'ANH-MOD-001' },
        { occupation_id: anhOcc.occupation_id, level_id: 4, m_code: 'ANH-MOD-002' },
        { occupation_id: hnsOcc.occupation_id, level_id: 1, m_code: 'HNS-MOD-001' },
        { occupation_id: hnsOcc.occupation_id, level_id: 2, m_code: 'HNS-MOD-001' },
        { occupation_id: hnsOcc.occupation_id, level_id: 2, m_code: 'HNS-MOD-002' },
        { occupation_id: hnsOcc.occupation_id, level_id: 3, m_code: 'HNS-MOD-001' },
        { occupation_id: hnsOcc.occupation_id, level_id: 3, m_code: 'HNS-MOD-002' },
        { occupation_id: hnsOcc.occupation_id, level_id: 4, m_code: 'HNS-MOD-001' },
        { occupation_id: hnsOcc.occupation_id, level_id: 4, m_code: 'HNS-MOD-002' },
        { occupation_id: mlsOcc.occupation_id, level_id: 3, m_code: 'MLS-MOD-001' },
        { occupation_id: mlsOcc.occupation_id, level_id: 3, m_code: 'MLS-MOD-002' },
        { occupation_id: mlsOcc.occupation_id, level_id: 4, m_code: 'MLS-MOD-001' },
        { occupation_id: mlsOcc.occupation_id, level_id: 4, m_code: 'MLS-MOD-002' },
        { occupation_id: nurOcc.occupation_id, level_id: 3, m_code: 'NUR-MOD-001' },
        { occupation_id: nurOcc.occupation_id, level_id: 3, m_code: 'NUR-MOD-002' },
        { occupation_id: nurOcc.occupation_id, level_id: 3, m_code: 'NUR-MOD-003' },
        { occupation_id: nurOcc.occupation_id, level_id: 4, m_code: 'NUR-MOD-001' },
        { occupation_id: nurOcc.occupation_id, level_id: 4, m_code: 'NUR-MOD-002' },
        { occupation_id: nurOcc.occupation_id, level_id: 4, m_code: 'NUR-MOD-003' },
        { occupation_id: phsOcc.occupation_id, level_id: 3, m_code: 'PHS-MOD-001' },
        { occupation_id: phsOcc.occupation_id, level_id: 3, m_code: 'PHS-MOD-002' },
        { occupation_id: phsOcc.occupation_id, level_id: 4, m_code: 'PHS-MOD-001' },
        { occupation_id: phsOcc.occupation_id, level_id: 4, m_code: 'PHS-MOD-002' }
      ];
      
      for (const data of curriculumData) {
        const [curriculum, created] = await LevelModule.findOrCreate({
          where: { 
            occupation_id: data.occupation_id, 
            level_id: data.level_id, 
            m_code: data.m_code 
          },
          defaults: data,
          transaction
        });
        if (!created) {
          await curriculum.update(data, { transaction });
        }
      }

      // ==================== 6. SEED ACADEMIC YEARS ====================
      console.log('📚 Seeding Academic Years...');
      const academicYearData = [
        { academic_year_label: '2018', start_date: '2018-01-01', end_date: '2019-10-30' },
        { academic_year_label: '2019', start_date: '2019-01-01', end_date: '2019-10-30' }
      ];
      
      const academicYears = [];
      for (const data of academicYearData) {
        const [year, created] = await AcademicYear.findOrCreate({
          where: { academic_year_label: data.academic_year_label },
          defaults: data,
          transaction
        });
        if (!created) {
          await year.update(data, { transaction });
        }
        academicYears.push(year);
      }

      // ==================== 7. SEED BATCHES ====================
      console.log('📚 Seeding Batches...');
      const currentYear = academicYears[0];
      const batchData = [
        { occupation_id: nurOcc.occupation_id, academic_year_id: currentYear.academic_year_id, level_id: 4, division: 'REGULAR', capacity: 45 },
        { occupation_id: hnsOcc.occupation_id, academic_year_id: currentYear.academic_year_id, level_id: 4, division: 'REGULAR', capacity: 35 },
        { occupation_id: acfOcc.occupation_id, academic_year_id: currentYear.academic_year_id, level_id: 4, division: 'REGULAR', capacity: 40 }
      ];
      
      const batches = [];
      for (const data of batchData) {
        const [batch, created] = await Batch.findOrCreate({
          where: { 
            occupation_id: data.occupation_id, 
            academic_year_id: data.academic_year_id, 
            level_id: data.level_id,
            division: data.division 
          },
          defaults: data,
          transaction
        });
        if (!created) {
          await batch.update(data, { transaction });
        }
        batches.push(batch);
      }

      // ==================== 8. SEED PERSONS ====================
      console.log('👥 Seeding Persons...');
      const personData = [
        { first_name: 'Admin', last_name: 'User', email: 'admin@gvc.edu', phone: '+251911111111' },
        { first_name: 'John', last_name: 'Doe', email: 'john.doe@gvc.edu', phone: '+251922222222', gender: 'M' },
        { first_name: 'Amina', last_name: 'Yusuf', email: 'amina.yusuf@gvc.edu', phone: '+251933333333', gender: 'F' },
        { first_name: 'Jabiru', last_name: 'Aba jiru', middle_name: 'Abamilki', email: 'jabiru@gvc.edu', phone: '+251944444444', gender: 'M', date_of_birth: '1998-05-15' }
      ];
      
      const persons = [];
      for (const data of personData) {
        const [person, created] = await Person.findOrCreate({
          where: { email: data.email },
          defaults: data,
          transaction
        });
        if (!created) {
          await person.update(data, { transaction });
        }
        persons.push(person);
      }

      // ==================== 9. SEED PERMISSIONS ====================
      console.log('🔐 Seeding Permissions...');
      const permissionData = [
        { permission_code: 'view_users', permission_name: 'View Users', module_scope: 'auth' },
        { permission_code: 'manage_users', permission_name: 'Manage Users', module_scope: 'auth' },
        { permission_code: 'view_sector', permission_name: 'View Sectors', module_scope: 'academics' },
        { permission_code: 'manage_sector', permission_name: 'Manage Sectors', module_scope: 'academics' },
        { permission_code: 'view_occupation', permission_name: 'View Occupations', module_scope: 'academics' },
        { permission_code: 'manage_occupation', permission_name: 'Manage Occupations', module_scope: 'academics' },
        { permission_code: 'view_level', permission_name: 'View Levels', module_scope: 'academics' },
        { permission_code: 'manage_level', permission_name: 'Manage Levels', module_scope: 'academics' },
        { permission_code: 'view_module', permission_name: 'View Modules', module_scope: 'academics' },
        { permission_code: 'manage_module', permission_name: 'Manage Modules', module_scope: 'academics' },
        { permission_code: 'view_batch', permission_name: 'View Batches', module_scope: 'academics' },
        { permission_code: 'manage_batch', permission_name: 'Manage Batches', module_scope: 'academics' },
        { permission_code: 'view_curriculum', permission_name: 'View Curriculum', module_scope: 'academics' },
        { permission_code: 'manage_curriculum', permission_name: 'Manage Curriculum', module_scope: 'academics' },
        { permission_code: 'view_academic_year', permission_name: 'View Academic Years', module_scope: 'academics' },
        { permission_code: 'manage_academic_year', permission_name: 'Manage Academic Years', module_scope: 'academics' },
        { permission_code: 'view_offering', permission_name: 'View Module Offerings', module_scope: 'enrollment' },
        { permission_code: 'manage_offering', permission_name: 'Manage Module Offerings', module_scope: 'enrollment' },
        { permission_code: 'manage_enrollment', permission_name: 'Manage Enrollments', module_scope: 'enrollment' },
        { permission_code: 'view_academic_progress', permission_name: 'View Academic Progress', module_scope: 'enrollment' },
        { permission_code: 'manage_grading', permission_name: 'Manage Grading', module_scope: 'grading' },
        { permission_code: 'view_instructor', permission_name: 'View Instructors', module_scope: 'instructors' },
        { permission_code: 'manage_instructor', permission_name: 'Manage Instructors', module_scope: 'instructors' },
        { permission_code: 'view_staff', permission_name: 'View Staff', module_scope: 'staff' },
        { permission_code: 'manage_staff', permission_name: 'Manage Staff', module_scope: 'staff' },
        { permission_code: 'view_student', permission_name: 'View Students', module_scope: 'students' },
        { permission_code: 'manage_student', permission_name: 'Manage Students', module_scope: 'students' },
        { permission_code: 'manage_announcement', permission_name: 'Manage Announcements', module_scope: 'announcements' },
        { permission_code: 'view_announcement', permission_name: 'View Announcements', module_scope: 'announcements' }
      ];
      
      for (const data of permissionData) {
        const [permission, created] = await Permission.findOrCreate({
          where: { permission_code: data.permission_code },
          defaults: data,
          transaction
        });
        if (!created) {
          await permission.update(data, { transaction });
        }
      }

      const allPermissions = await Permission.findAll({ transaction });
      const allPermissionCodes = allPermissions.map(p => p.permission_code);

      // ==================== 10. SEED ROLES ====================
      console.log('🔐 Seeding Roles...');
      const roleData = [
        { role_code: 'ADMIN', role_name: 'Super Administrator', permissions: allPermissionCodes },
        { role_code: 'REGISTRAR', role_name: 'Registrar', permissions: ['view_users', 'manage_users', 'view_occupation', 'view_level', 'view_module', 'view_batch', 'view_academic_year', 'view_student', 'manage_student', 'view_academic_progress'] },
        { role_code: 'INSTRUCTOR', role_name: 'Instructor', permissions: ['view_module', 'view_batch', 'view_offering', 'manage_offering', 'manage_enrollment', 'manage_grading', 'view_student'] }
      ];
      
      const roles = [];
      for (const data of roleData) {
        const [role, created] = await Role.findOrCreate({
          where: { role_code: data.role_code },
          defaults: data,
          transaction
        });
        if (!created) {
          await role.update(data, { transaction });
        }
        roles.push(role);
      }

      // ==================== 11. ASSIGN PERMISSIONS TO ROLES ====================
      console.log('🔐 Assigning Permissions to Roles...');
      
      // Clear existing role-permission associations
      await RolePermission.destroy({ where: {}, transaction });
      
      // Create new associations
      const rolePermissions = [];
      for (const role of roles) {
        const rolePerms = role.permissions || [];
        const permIds = allPermissions.filter(p => rolePerms.includes(p.permission_code)).map(p => p.permission_id);
        for (const permId of permIds) {
          rolePermissions.push({ role_id: role.role_id, permission_id: permId });
        }
      }
      
      if (rolePermissions.length > 0) {
        await RolePermission.bulkCreate(rolePermissions, { transaction, ignoreDuplicates: true });
      }
      
      console.log(`✅ Assigned permissions: Admin: ${allPermissionCodes.length}, Registrar: ${roles[1].permissions.length}, Instructor: ${roles[2].permissions.length}`);

      // ==================== 12. SEED USER ACCOUNTS ====================
      console.log('👤 Seeding User Accounts...');
      const hashedPassword = await argon2.hash('admin123', { type: argon2.argon2id });
      
      const userData = [
        { person_id: persons[0].person_id, email: 'admin@gvc.edu', password_hash: hashedPassword, status: 'ACTIVE', must_change_password: false, hash_algorithm: 'ARGON2ID' },
        { person_id: persons[1].person_id, email: 'john.doe@gvc.edu', password_hash: hashedPassword, status: 'ACTIVE', must_change_password: false, hash_algorithm: 'ARGON2ID' },
        { person_id: persons[2].person_id, email: 'amina.yusuf@gvc.edu', password_hash: hashedPassword, status: 'ACTIVE', must_change_password: false, hash_algorithm: 'ARGON2ID' }
      ];
      
      const users = [];
      for (const data of userData) {
        const [user, created] = await UserAccount.findOrCreate({
          where: { email: data.email },
          defaults: data,
          transaction
        });
        if (!created) {
          await user.update(data, { transaction });
        }
        users.push(user);
      }

      // ==================== 13. ASSIGN ROLES TO USERS ====================
      console.log('👤 Assigning Roles to Users...');
      const adminRole = roles.find(r => r.role_code === 'ADMIN');
      const instructorRole = roles.find(r => r.role_code === 'INSTRUCTOR');
      const registrarRole = roles.find(r => r.role_code === 'REGISTRAR');

      // Clear existing user-role associations
      await UserRole.destroy({ where: {}, transaction });

      // Create new associations
      await UserRole.bulkCreate([
        { user_id: users[0].user_id, role_id: adminRole.role_id },
        { user_id: users[1].user_id, role_id: instructorRole.role_id },
        { user_id: users[2].user_id, role_id: registrarRole.role_id }
      ], { transaction, ignoreDuplicates: true });

      // ==================== 14. SEED INSTRUCTORS ====================
      console.log('👨‍🏫 Seeding Instructors...');
      const instructorDataSeed = [
        { person_id: persons[1].person_id, staff_code: 'GVC/INST/001', occupation_id: hnsOcc.occupation_id, hire_date: '2024-01-15', qualification: 'MSc in Computer Science', employment_status: 'ACTIVE' }
      ];
      
      for (const data of instructorDataSeed) {
        const [instructor, created] = await Instructor.findOrCreate({
          where: { staff_code: data.staff_code },
          defaults: data,
          transaction
        });
        if (!created) {
          await instructor.update(data, { transaction });
        }
      }

      // ==================== 15. SEED STAFF ====================
      console.log('👔 Seeding Staff...');
      const staffDataSeed = [
        { person_id: persons[2].person_id, staff_code: 'GVC/STF/001', staff_type: 'REGISTRAR', employment_status: 'ACTIVE' }
      ];
      
      for (const data of staffDataSeed) {
        const [staff, created] = await Staff.findOrCreate({
          where: { staff_code: data.staff_code },
          defaults: data,
          transaction
        });
        if (!created) {
          await staff.update(data, { transaction });
        }
      }

      // ==================== 16. SEED STUDENTS ====================
      console.log('🎓 Seeding Students...');
      const studentDataSeed = [
        { 
          person_id: persons[3].person_id, 
          student_id: 'GVC/2026/001', 
          reg_year: 2026, 
          reg_sequence: 1,
          occupation_id: nurOcc.occupation_id,
          level_id: 4,
          batch_id: batches[0].batch_id,
          status: 'ACTIVE'
        }
      ];
      
      let student;
      for (const data of studentDataSeed) {
        const [foundStudent, created] = await Student.findOrCreate({
          where: { student_id: data.student_id },
          defaults: data,
          transaction
        });
        if (!created) {
          await foundStudent.update(data, { transaction });
        }
        student = foundStudent;
      }

      // ==================== 17. SEED MODULE OFFERINGS ====================
      console.log('📖 Seeding Module Offerings...');
      const nurModules = modules.filter(m => m.occupation_id === nurOcc.occupation_id);
      const instructor = await Instructor.findOne({ where: { staff_code: 'GVC/INST/001' }, transaction });
      
      const offeringDataSeed = [
        { module_id: nurModules[0].module_id, batch_id: batches[0].batch_id, section_code: 'A', instructor_id: instructor.instructor_id, capacity: 30 },
        { module_id: nurModules[1].module_id, batch_id: batches[0].batch_id, section_code: 'A', instructor_id: instructor.instructor_id, capacity: 30 }
      ];
      
      const offerings = [];
      for (const data of offeringDataSeed) {
        const [offering, created] = await ModuleOffering.findOrCreate({
          where: { 
            module_id: data.module_id, 
            batch_id: data.batch_id, 
            section_code: data.section_code 
          },
          defaults: data,
          transaction
        });
        if (!created) {
          await offering.update(data, { transaction });
        }
        offerings.push(offering);
      }

      // ==================== 18. SEED ENROLLMENTS ====================
      console.log('📝 Seeding Enrollments...');
      const enrollmentDataSeed = [
        { student_pk: student.student_pk, offering_id: offerings[0].offering_id, status: 'ENROLLED' },
        { student_pk: student.student_pk, offering_id: offerings[1].offering_id, status: 'ENROLLED' }
      ];
      
      for (const data of enrollmentDataSeed) {
        const [enrollment, created] = await Enrollment.findOrCreate({
          where: { student_pk: data.student_pk, offering_id: data.offering_id },
          defaults: data,
          transaction
        });
        if (!created) {
          await enrollment.update(data, { transaction });
        }
      }

      // ==================== 19. SEED GRADE SCALES ====================
      console.log('📊 Seeding Grade Scales...');
      const gradeScaleDataSeed = [
        { min_score: 85, max_score: 100, letter: 'A', grade_point: 4.0, is_pass: true },
        { min_score: 75, max_score: 84.99, letter: 'B', grade_point: 3.0, is_pass: true },
        { min_score: 65, max_score: 74.99, letter: 'C', grade_point: 2.0, is_pass: true },
        { min_score: 50, max_score: 64.99, letter: 'D', grade_point: 1.0, is_pass: true },
        { min_score: 0, max_score: 49.99, letter: 'F', grade_point: 0.0, is_pass: false }
      ];
      
      for (const data of gradeScaleDataSeed) {
        const [scale, created] = await GradeScale.findOrCreate({
          where: { letter: data.letter },
          defaults: data,
          transaction
        });
        if (!created) {
          await scale.update(data, { transaction });
        }
      }

      // ==================== 20. SEED ASSESSMENTS ====================
      console.log('📋 Seeding Assessments...');
      const assessmentDataSeed = [
        { offering_id: offerings[0].offering_id, name: 'Final Exam', weight: 70 },
        { offering_id: offerings[0].offering_id, name: 'Project', weight: 30 },
        { offering_id: offerings[1].offering_id, name: 'Final Exam', weight: 60 },
        { offering_id: offerings[1].offering_id, name: 'Practical Assessment', weight: 40 }
      ];
      
      const assessments = [];
      for (const data of assessmentDataSeed) {
        const [assessment, created] = await Assessment.findOrCreate({
          where: { offering_id: data.offering_id, name: data.name },
          defaults: data,
          transaction
        });
        if (!created) {
          await assessment.update(data, { transaction });
        }
        assessments.push(assessment);
      }

      // ==================== 21. SEED STUDENT ASSESSMENT SCORES ====================
      console.log('✍️ Seeding Student Assessment Scores...');
      const scoreDataSeed = [
        { student_pk: student.student_pk, assessment_id: assessments[0].assessment_id, score: 85 },
        { student_pk: student.student_pk, assessment_id: assessments[1].assessment_id, score: 90 },
        { student_pk: student.student_pk, assessment_id: assessments[2].assessment_id, score: 78 },
        { student_pk: student.student_pk, assessment_id: assessments[3].assessment_id, score: 82 }
      ];
      
      for (const data of scoreDataSeed) {
        const [score, created] = await StudentAssessmentScore.findOrCreate({
          where: { student_pk: data.student_pk, assessment_id: data.assessment_id },
          defaults: data,
          transaction
        });
        if (!created) {
          await score.update(data, { transaction });
        }
      }

      // ==================== 22. SEED STUDENT RESULTS ====================
      console.log('🎯 Seeding Student Results...');
      const resultDataSeed = [
        { student_pk: student.student_pk, offering_id: offerings[0].offering_id, attempt_no: 1, total_score: 86.5, letter_grade: 'A', grade_point: 4.0, status: 'PASSED' },
        { student_pk: student.student_pk, offering_id: offerings[1].offering_id, attempt_no: 1, total_score: 79.6, letter_grade: 'B', grade_point: 3.0, status: 'PASSED' }
      ];
      
      for (const data of resultDataSeed) {
        const [result, created] = await StudentResult.findOrCreate({
          where: { student_pk: data.student_pk, offering_id: data.offering_id, attempt_no: data.attempt_no },
          defaults: data,
          transaction
        });
        if (!created) {
          await result.update(data, { transaction });
        }
      }

      // ==================== 23. SEED GRADE SUBMISSIONS ====================
      console.log('📑 Seeding Grade Submissions...');
      const submissionDataSeed = [
        { offering_id: offerings[0].offering_id, instructor_id: instructor.instructor_id, status: 'APPROVED' },
        { offering_id: offerings[1].offering_id, instructor_id: instructor.instructor_id, status: 'APPROVED' }
      ];
      
      for (const data of submissionDataSeed) {
        const [submission, created] = await GradeSubmission.findOrCreate({
          where: { offering_id: data.offering_id, instructor_id: data.instructor_id },
          defaults: data,
          transaction
        });
        if (!created) {
          await submission.update(data, { transaction });
        }
      }

      await transaction.commit();
      console.log('✅ Database seeding completed successfully!');
      console.log(`📊 Summary: ${sectors.length} sectors, ${occupations.length} occupations, ${modules.length} modules, ${batches.length} batches, ${users.length} users created.`);
      console.log(`🔐 Admin user has ${allPermissionCodes.length} permissions assigned.`);
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  async truncateAll() {
    console.log('⚠️ Truncating all tables...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const tables = [
      'student_assessment_scores', 'student_results', 'assessments', 'grade_submissions', 'grade_scales',
      'enrollments', 'module_offerings', 'students', 'instructors', 'staff',
      'level_modules', 'batches', 'academic_years', 'modules', 'levels', 'occupations', 'sectors',
      'user_roles', 'role_permissions', 'user_accounts', 'roles', 'permissions', 'persons'
    ];
    
    for (const table of tables) {
      await sequelize.query(`TRUNCATE TABLE ${table}`);
      console.log(`  Truncated: ${table}`);
    }
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ All tables truncated successfully!');
  }
  
  async run() {
    try {
      await sequelize.authenticate();
      console.log('Database connection established');
      
      const args = process.argv.slice(2);
      const shouldTruncate = args.includes('--truncate');
      
      if (shouldTruncate) {
        await this.truncateAll();
      }
      
      await this.seedAll();
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  }
}

const seeder = new Seeder();

if (import.meta.url === `file://${process.argv[1]}`) {
  seeder.run().catch(console.error);
}

export default seeder;