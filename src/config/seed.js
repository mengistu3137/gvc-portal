import argon2 from 'argon2';
import sequelize from './database.js';
import { UserAccount, Role, Permission } from '../modules/auth/auth.model.js';
import { Person } from '../modules/persons/person.model.js';
import {
  Sector,
  Occupation,
  Level,
  Module,
  AcademicYear,
  Batch,
  LevelModule
} from '../modules/academics/academic.model.js';
import { GradingPolicy } from '../modules/grading/grading.model.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting Database Seeding...');

    // 1. Sync Database (do not alter schema here; use migrations for schema changes)
    await sequelize.sync();

    // 2. Define Permissions (deduplicated + updated wording for grading)
    const permissionsData = [
      // AUTH Module
      { permission_code: 'view_users', permission_name: 'View User Accounts', module_scope: 'AUTH' },
      { permission_code: 'manage_users', permission_name: 'Create/Edit/Delete Users', module_scope: 'AUTH' },

      // ACADEMICS Module
      { permission_code: 'view_level', permission_name: 'View Levels', module_scope: 'ACADEMICS' },
      { permission_code: 'manage_level', permission_name: 'Create/Edit/Delete Levels', module_scope: 'ACADEMICS' },
      { permission_code: 'view_batch', permission_name: 'View Batches', module_scope: 'ACADEMICS' },
      { permission_code: 'manage_batch', permission_name: 'Create/Edit/Delete Batches', module_scope: 'ACADEMICS' },
      { permission_code: 'view_occupation', permission_name: 'View Occupations', module_scope: 'ACADEMICS' },
      { permission_code: 'manage_occupation', permission_name: 'Create/Edit/Delete Occupations', module_scope: 'ACADEMICS' },
      { permission_code: 'view_sector', permission_name: 'View Sectors', module_scope: 'ACADEMICS' },
      { permission_code: 'manage_sector', permission_name: 'Create/Edit/Delete Sectors', module_scope: 'ACADEMICS' },
      { permission_code: 'view_uc', permission_name: 'View Units of Competence', module_scope: 'ACADEMICS' },
      { permission_code: 'manage_uc', permission_name: 'Create/Edit/Delete Units of Competence', module_scope: 'ACADEMICS' },
      { permission_code: 'view_module', permission_name: 'View Modules', module_scope: 'ACADEMICS' },
      { permission_code: 'manage_module', permission_name: 'Create/Edit/Delete Modules', module_scope: 'ACADEMICS' },
      { permission_code: 'view_academic_year', permission_name: 'View Academic Years', module_scope: 'ACADEMICS' },
      { permission_code: 'manage_academic_year', permission_name: 'Create/Edit/Delete Academic Years', module_scope: 'ACADEMICS' },
      { permission_code: 'manage_curriculum', permission_name: 'Manage Curriculum (Level-Module Mapping)', module_scope: 'ACADEMICS' },
      { permission_code: 'view_curriculum', permission_name: 'View Curriculum (Level-Module Mapping)', module_scope: 'ACADEMICS' },

      // INSTRUCTORS / STAFF
      { permission_code: 'view_instructors', permission_name: 'View Instructors', module_scope: 'INSTRUCTORS' },
      { permission_code: 'manage_instructors', permission_name: 'Create/Edit/Delete Instructors', module_scope: 'INSTRUCTORS' },
      { permission_code: 'view_staff', permission_name: 'View Staff List', module_scope: 'STAFF' },
      { permission_code: 'manage_staff', permission_name: 'Create/Edit/Delete Staff Records', module_scope: 'STAFF' },

      // GRADING (JSON-based; no assessment tables)
      { permission_code: 'manage_grading', permission_name: 'Manage Grades and Submissions', module_scope: 'GRADING' },
      { permission_code: 'approve_grades_hod', permission_name: 'Approve Grades as HOD', module_scope: 'GRADING' },
      { permission_code: 'approve_grades_qa', permission_name: 'Approve Grades as QA', module_scope: 'GRADING' },
      { permission_code: 'approve_grades_tvet', permission_name: 'Approve Grades as TVET', module_scope: 'GRADING' },
      { permission_code: 'finalize_grades_registrar', permission_name: 'Finalize Grades as Registrar', module_scope: 'GRADING' },
      { permission_code: 'manage_grading_policy', permission_name: 'Create/Edit Grading Policies (JSON grade scales)', module_scope: 'GRADING' },

      // ENROLLMENT / PROGRESS
      { permission_code: 'manage_enrollment', permission_name: 'Create/Update Enrollment and Prerequisites', module_scope: 'ENROLLMENT' },
      { permission_code: 'view_academic_progress', permission_name: 'View Student GPA and Academic Progress', module_scope: 'ENROLLMENT' },

      // STUDENTS
      { permission_code: 'manage_student', permission_name: 'Create/Edit/Delete Student Records', module_scope: 'STUDENTS' },
      { permission_code: 'view_students', permission_name: 'View Student List', module_scope: 'STUDENTS' },
      { permission_code: 'create_student', permission_name: 'Register Students', module_scope: 'STUDENTS' },
      { permission_code: 'manage_students', permission_name: 'Manage Student Records', module_scope: 'STUDENTS' }
    ];
    await Permission.bulkCreate(permissionsData, { ignoreDuplicates: true });
    console.log('✅ Permissions Seeded');

    // 3. Create Roles
    const [adminRole] = await Role.findOrCreate({ 
      where: { role_code: 'ADMIN' }, 
      defaults: { role_name: 'System Administrator' } 
    });

    const [registrarRole] = await Role.findOrCreate({ 
      where: { role_code: 'REGISTRAR' }, 
      defaults: { role_name: 'College Registrar' } 
    });
    const [studentRole] = await Role.findOrCreate({
      where: { role_code: 'STUDENT' }, 
      defaults: { role_name: 'Student' } 
    });
    console.log('✅ Roles Seeded');

    // 4. Map Permissions
    const allPerms = await Permission.findAll();
    await adminRole.setGranted_permissions(allPerms);
    
    const registrarPerms = await Permission.findAll({
      where: {
        permission_code: [
          'create_student',
          'view_students',
          'manage_batch',
          'manage_grading',
          'finalize_grades_registrar',
          'manage_grading_policy',
          'manage_enrollment',
          'view_academic_progress'
        ]
      }
    });
    const studentPerms = await Permission.findAll({
      where: { permission_code: ['view_students'] }
    });
    await registrarRole.setGranted_permissions(registrarPerms);
    await studentRole.setGranted_permissions(studentPerms);

    console.log('✅ Permissions mapped to Roles');

    // 5. Seed Academics Core Data (idempotent)
    const [healthSector] = await Sector.findOrCreate({
      where: { sector_code: 'HLT' },
      defaults: { sector_name: 'Health Sector' }
    });

    const [ictSector] = await Sector.findOrCreate({
      where: { sector_code: 'ICT' },
      defaults: { sector_name: 'Information and Communication Technology' }
    });

    const [nursingOccupation] = await Occupation.findOrCreate({
      where: { occupation_code: 'NUR' },
      defaults: {
        sector_id: healthSector.sector_id,
        occupation_name: 'Nursing'
      }
    });

    const [softwareOccupation] = await Occupation.findOrCreate({
      where: { occupation_code: 'SWE' },
      defaults: {
        sector_id: ictSector.sector_id,
        occupation_name: 'Software Development'
      }
    });

    await Level.findOrCreate({
      where: { level_id: 4, occupation_id: nursingOccupation.occupation_id },
      defaults: { level_name: 'IV' }
    });

    await Level.findOrCreate({
      where: { level_id: 4, occupation_id: softwareOccupation.occupation_id },
      defaults: { level_name: 'IV' }
    });

    const [nursingModule] = await Module.findOrCreate({
      where: { m_code: 'NUR-MOD-001' },
      defaults: {
        occupation_id: nursingOccupation.occupation_id,
        unit_competency: 'Provide comprehensive nursing care in clinical settings',
        theory_hours: 80,
        practical_hours: 120,
        cooperative_hours: 40,
        learning_hours: 240,
        credit_units: 15.5
      }
    });

    const [softwareModule] = await Module.findOrCreate({
      where: { m_code: 'SWE-MOD-001' },
      defaults: {
        occupation_id: softwareOccupation.occupation_id,
        unit_competency: 'Develop and maintain software applications using modern tools',
        theory_hours: 70,
        practical_hours: 130,
        cooperative_hours: 40,
        learning_hours: 240,
        credit_units: 16.0
      }
    });

    const [year2526] = await AcademicYear.findOrCreate({
      where: { academic_year_label: '2018' },
      defaults: {
        start_date: '2025-09-01',
        end_date: '2026-08-31'
      }
    });

    // 6b. Seed a default grading policy aligned to new JSON schema
    const defaultGradeScale = [
      { letter_grade: 'A', min_score: 85, max_score: 100, grade_points: 4.0, is_pass: true },
      { letter_grade: 'B', min_score: 75, max_score: 84.99, grade_points: 3.0, is_pass: true },
      { letter_grade: 'C', min_score: 65, max_score: 74.99, grade_points: 2.0, is_pass: true },
      { letter_grade: 'D', min_score: 50, max_score: 64.99, grade_points: 1.0, is_pass: true },
      { letter_grade: 'F', min_score: 0, max_score: 49.99, grade_points: 0, is_pass: false }
    ];

    const [defaultPolicy] = await GradingPolicy.findOrCreate({
      where: { policy_name: 'Default Policy' },
      defaults: { is_locked: false, grade_scale: defaultGradeScale }
    });

    const [nursingBatch] = await Batch.findOrCreate({
      where: {
        occupation_id: nursingOccupation.occupation_id,
        academic_year_id: year2526.academic_year_id,
        level_id: 4,
        track_type: 'REGULAR'
      },
      defaults: {
        capacity: 45,
        grading_policy_id: defaultPolicy.policy_id
      }
    });

    await Batch.findOrCreate({
      where: {
        occupation_id: softwareOccupation.occupation_id,
        academic_year_id: year2526.academic_year_id,
        level_id: 4,
        track_type: 'REGULAR'
      },
      defaults: {
        capacity: 40,
        grading_policy_id: defaultPolicy.policy_id
      }
    });

    await LevelModule.findOrCreate({
      where: {
        occupation_id: nursingOccupation.occupation_id,
        level_id: 4,
        m_code: nursingModule.m_code,
        semester: 1
      },
      defaults: {}
    });

    await LevelModule.findOrCreate({
      where: {
        occupation_id: softwareOccupation.occupation_id,
        level_id: 4,
        m_code: softwareModule.m_code,
        semester: 1
      },
      defaults: {}
    });

    console.log(`✅ Academics Seeded (Sectors: 2, Occupations: 2, Batches include ID ${nursingBatch.batch_id})`);

    // 6. Define Default Password
    const defaultPassword = await argon2.hash('password123', { type: argon2.argon2id });

    // 7. User Data for Testing PFSS
    const usersToSeed = [
      { email: 'admin@gvc.edu', status: 'ACTIVE', role: adminRole, password: 'admin123', first_name: 'System', last_name: 'Admin' },
      { email: 'registrar.senior@gvc.edu', status: 'ACTIVE', role: registrarRole, first_name: 'Senior', last_name: 'Registrar' },
      { email: 'registrar.junior@gvc.edu', status: 'ACTIVE', role: registrarRole, first_name: 'Junior', last_name: 'Registrar' },
      { email: 'finance.officer@gvc.edu', status: 'ACTIVE', role: registrarRole, first_name: 'Finance', last_name: 'Officer' },
      { email: 'locked.staff@gvc.edu', status: 'LOCKED', role: registrarRole, first_name: 'Locked', last_name: 'Staff' },
      { email: 'retired.staff@gvc.edu', status: 'DISABLED', role: registrarRole, first_name: 'Retired', last_name: 'Staff' }
     

    ];

    for (const u of usersToSeed) {
      // Use specific password if provided (for admin), otherwise default
      const pass = u.password ? await argon2.hash(u.password, { type: argon2.argon2id }) : defaultPassword;

      // Check if user already exists to avoid unique constraint errors
      let user = await UserAccount.findOne({ where: { email: u.email } });
      if (user) {
        try { await user.setRoles([u.role]); } catch (e) { /* ignore */ }
        continue;
      }

      try {
        const person = await Person.create({
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email
        });
        user = await UserAccount.create({ person_id: person.person_id, email: u.email, password_hash: pass, status: u.status });
        await user.setRoles([u.role]);
      } catch (err) {
        // Handle potential race-condition duplicate insert
        if (err.name === 'SequelizeUniqueConstraintError' || (err.original && err.original.code === 'ER_DUP_ENTRY')) {
          const existing = await UserAccount.findOne({ where: { email: u.email } });
          if (existing) {
            try { await existing.setRoles([u.role]); } catch (e) { /* ignore */ }
            continue;
          }
        }
        throw err;
      }
    }

    console.log('Users Seeded (6 total)');
    console.log('🚀 Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  }
};

seedDatabase();