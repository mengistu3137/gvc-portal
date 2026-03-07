import argon2 from 'argon2';
import sequelize from './database.js';
import { UserAccount, Role, Permission } from '../modules/auth/auth.model.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting Database Seeding...');

    // 1. Sync Database (do not alter schema here; use migrations for schema changes)
    await sequelize.sync();

    // 2. Define Permissions
    // 2. Define Permissions
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
      { permission_code: "manage_curriculum", permission_name: "Manage Curriculum (Level-Module Mapping)", module_scope: "ACADEMICS" },
{permission_code:"manage_student", permission_name:"Create/Edit/Delete Student Records", module_scope:"STUDENTS"},
{permission_code:"view_students", permission_name:"View Student List", module_scope:"STUDENTS"},
  
  // STUDENTS Module
  { permission_code: 'create_student', permission_name: 'Register Students', module_scope: 'STUDENTS' },
  { permission_code: 'view_students', permission_name: 'View Student List', module_scope: 'STUDENTS' },
  { permission_code: 'manage_students', permission_name: 'Manage Student Records', module_scope: 'STUDENTS' },
  { permission_code: 'view_curriculum', permission_name: 'View Curriculum (Level-Module Mapping)', module_scope: 'ACADEMICS' }
]
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
    await adminRole.setPermissions(allPerms);
    
    const registrarPerms = await Permission.findAll({
      where: { permission_code: ['create_student', 'view_students', 'manage_batch'] }
    });
    const studentPerms = await Permission.findAll({
      where: { permission_code: ['view_students'] }
    });
    await registrarRole.setPermissions(registrarPerms);
    await studentRole.setPermissions(studentPerms);

    console.log('✅ Permissions mapped to Roles');

    // 5. Define Default Password
    const defaultPassword = await argon2.hash('password123', { type: argon2.argon2id });

    // 6. User Data for Testing PFSS
    const usersToSeed = [
      { email: 'admin@gvc.edu', status: 'ACTIVE', role: adminRole, password: 'admin123' },
      { email: 'registrar.senior@gvc.edu', status: 'ACTIVE', role: registrarRole },
      { email: 'registrar.junior@gvc.edu', status: 'ACTIVE', role: registrarRole },
      { email: 'finance.officer@gvc.edu', status: 'ACTIVE', role: registrarRole },
      { email: 'locked.staff@gvc.edu', status: 'LOCKED', role: registrarRole },
      { email: 'retired.staff@gvc.edu', status: 'DISABLED', role: registrarRole }
     

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
        user = await UserAccount.create({ email: u.email, password_hash: pass, status: u.status });
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