import sequelize from '../config/database.js';
import { Permission } from '../modules/auth/auth.model.js';

export const PREDEFINED_PERMISSIONS = [
  { permission_code: 'view_users', permission_name: 'View Users', module_scope: 'auth' },
  { permission_code: 'manage_users', permission_name: 'Manage Users', module_scope: 'auth' },
  { permission_code: 'manage_roles', permission_name: 'Manage Roles', module_scope: 'auth' },
  { permission_code: 'assign_permissions', permission_name: 'Assign Permissions', module_scope: 'auth' },
  { permission_code: 'view_reports', permission_name: 'View Reports', module_scope: 'auth' },
  { permission_code: 'export_reports', permission_name: 'Export Reports', module_scope: 'auth' },

  { permission_code: 'manage_instructors', permission_name: 'Manage Instructors', module_scope: 'instructors' },
  { permission_code: 'view_instructors', permission_name: 'View Instructors', module_scope: 'instructors' },

  { permission_code: 'manage_students', permission_name: 'Manage Students', module_scope: 'students' },
  { permission_code: 'view_students', permission_name: 'View Students', module_scope: 'students' },

  { permission_code: 'manage_modules', permission_name: 'Manage Modules', module_scope: 'academics' },
  { permission_code: 'view_modules', permission_name: 'View Modules', module_scope: 'academics' },
  { permission_code: 'manage_batches', permission_name: 'Manage Batches', module_scope: 'academics' },
  { permission_code: 'view_batches', permission_name: 'View Batches', module_scope: 'academics' },

  { permission_code: 'view_sector', permission_name: 'View Sectors', module_scope: 'academics' },
  { permission_code: 'manage_sector', permission_name: 'Manage Sectors', module_scope: 'academics' },
  { permission_code: 'view_occupation', permission_name: 'View Occupations', module_scope: 'academics' },
  { permission_code: 'manage_occupation', permission_name: 'Manage Occupations', module_scope: 'academics' },
  { permission_code: 'view_level', permission_name: 'View Levels', module_scope: 'academics' },
  { permission_code: 'manage_level', permission_name: 'Manage Levels', module_scope: 'academics' },
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

  { permission_code: 'view_staff', permission_name: 'View Staff', module_scope: 'staff' },
  { permission_code: 'manage_staff', permission_name: 'Manage Staff', module_scope: 'staff' },

  { permission_code: 'view_announcement', permission_name: 'View Announcements', module_scope: 'announcements' },
  { permission_code: 'manage_announcement', permission_name: 'Manage Announcements', module_scope: 'announcements' }
];

class PermissionSeeder {
  async seedPermissions(transaction = null) {
    await Permission.bulkCreate(PREDEFINED_PERMISSIONS, {
      transaction,
      updateOnDuplicate: ['permission_name', 'module_scope'],
      ignoreDuplicates: false
    });

    return Permission.findAll({ transaction });
  }

  async seedPermissionsIfMissing(transaction = null) {
    await Permission.bulkCreate(PREDEFINED_PERMISSIONS, {
      transaction,
      ignoreDuplicates: true
    });

    return Permission.findAll({ transaction });
  }

  async run() {
    const transaction = await sequelize.transaction();
    try {
      await this.seedPermissions(transaction);
      await transaction.commit();
      console.log(`✅ Seeded ${PREDEFINED_PERMISSIONS.length} permissions`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

export default new PermissionSeeder();
