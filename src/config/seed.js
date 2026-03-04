import argon2 from 'argon2';
import sequelize from './database.js';
import { UserAccount, Role, Permission } from '../modules/auth/auth.model.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting Database Seeding...');

    // 1. Sync Database
    await sequelize.sync({ alter: true });

    // 2. Define Permissions
    const permissionsData = [
      { permission_code: 'view_users', permission_name: 'View User Accounts', module_scope: 'AUTH' },
      { permission_code: 'manage_users', permission_name: 'Create/Edit/Delete Users', module_scope: 'AUTH' },
      { permission_code: 'create_dept', permission_name: 'Create Departments', module_scope: 'ACADEMICS' },
      { permission_code: 'manage_batch', permission_name: 'Manage Batches', module_scope: 'ACADEMICS' },
      { permission_code: 'create_student', permission_name: 'Register Students', module_scope: 'STUDENTS' },
      { permission_code: 'view_students', permission_name: 'View Student List', module_scope: 'STUDENTS' }
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
    console.log('✅ Roles Seeded');

    // 4. Map Permissions
    const allPerms = await Permission.findAll();
    await adminRole.setPermissions(allPerms);
    
    const registrarPerms = await Permission.findAll({
      where: { permission_code: ['create_student', 'view_students', 'manage_batch'] }
    });
    await registrarRole.setPermissions(registrarPerms);
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
      
      const [user] = await UserAccount.findOrCreate({
        where: { email: u.email },
        defaults: {
          password_hash: pass,
          status: u.status
        }
      });

      // Assign Role (using 'roles' alias from the previous fix)
      await user.setRoles([u.role]);
    }

    console.log('✅ Users Seeded (6 total)');
    console.log('🚀 Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  }
};

seedDatabase();