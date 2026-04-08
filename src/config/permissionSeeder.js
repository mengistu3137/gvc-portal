// ==================== PERMISSION SEEDER MODULE ====================
// Save this as separate file: seeders/permission.seeder.js

import sequelize from '../config/database.js';
import { Permission, Role, RolePermission } from '../modules/auth/auth.model.js';

class PermissionSeeder {
  // Define all permissions by module
  getPermissionsByModule() {
    return {
      auth: [
        { permission_code: 'view_users', permission_name: 'View Users' },
        { permission_code: 'manage_users', permission_name: 'Manage Users' },
        {permission_code:'manage_announcement', permission_name: 'Manage Announcements'},
        {permission_code:'view_announcement', permission_name: 'View Announcements'}
      ],
      academics: [
        { permission_code: 'view_sector', permission_name: 'View Sectors' },
        { permission_code: 'manage_sector', permission_name: 'Manage Sectors' },
        { permission_code: 'view_occupation', permission_name: 'View Occupations' },
        { permission_code: 'manage_occupation', permission_name: 'Manage Occupations' },
        { permission_code: 'view_level', permission_name: 'View Levels' },
        { permission_code: 'manage_level', permission_name: 'Manage Levels' },
        { permission_code: 'view_module', permission_name: 'View Modules' },
        { permission_code: 'manage_module', permission_name: 'Manage Modules' },
        { permission_code: 'view_batch', permission_name: 'View Batches' },
        { permission_code: 'manage_batch', permission_name: 'Manage Batches' },
        { permission_code: 'view_curriculum', permission_name: 'View Curriculum' },
        { permission_code: 'manage_curriculum', permission_name: 'Manage Curriculum' },
        { permission_code: 'view_academic_year', permission_name: 'View Academic Years' },
        { permission_code: 'manage_academic_year', permission_name: 'Manage Academic Years' }
      ],
      enrollment: [
        { permission_code: 'view_offering', permission_name: 'View Module Offerings' },
        { permission_code: 'manage_offering', permission_name: 'Manage Module Offerings' },
        { permission_code: 'manage_enrollment', permission_name: 'Manage Enrollments' },
        { permission_code: 'view_academic_progress', permission_name: 'View Academic Progress' }
      ],
      grading: [
        { permission_code: 'manage_grading', permission_name: 'Manage Grading' }
      ],
      instructors: [
        { permission_code: 'view_instructor', permission_name: 'View Instructors' },
        { permission_code: 'manage_instructor', permission_name: 'Manage Instructors' }
      ],
      staff: [
        { permission_code: 'view_staff', permission_name: 'View Staff' },
        { permission_code: 'manage_staff', permission_name: 'Manage Staff' }
      ],
      students: [
        { permission_code: 'view_student', permission_name: 'View Students' },
        { permission_code: 'manage_student', permission_name: 'Manage Students' }
      ]
    };
  }

  // Get all permissions as flat array
  getAllPermissions() {
    const permissionsByModule = this.getPermissionsByModule();
    const allPermissions = [];
    
    for (const [moduleScope, permissions] of Object.entries(permissionsByModule)) {
      permissions.forEach(perm => {
        allPermissions.push({
          ...perm,
          module_scope: moduleScope
        });
      });
    }
    
    return allPermissions;
  }

  // Define role permissions
  getRolePermissions() {
    const allPermissions = this.getAllPermissions();
    const allPermissionCodes = allPermissions.map(p => p.permission_code);
    
    return {
      ADMIN: {
        role_code: 'ADMIN',
        role_name: 'Super Administrator',
        permissions: allPermissionCodes  // ALL permissions
      },
      REGISTRAR: {
        role_code: 'REGISTRAR',
        role_name: 'Registrar',
        permissions: [
          'view_users', 'manage_users',
          'view_occupation', 'view_level', 'view_module', 'view_batch', 'view_academic_year',
          'view_student', 'manage_student', 'view_academic_progress'
        ]
      },
      INSTRUCTOR: {
        role_code: 'INSTRUCTOR',
        role_name: 'Instructor',
        permissions: [
          'view_module', 'view_batch', 'view_offering', 'manage_offering',
          'manage_enrollment', 'manage_grading', 'view_student'
        ]
      }
    };
  }

  // Sync permissions (upsert - update existing, create new)
  async syncPermissions(transaction) {
    console.log('🔐 Syncing Permissions...');
    const permissions = this.getAllPermissions();
    
    for (const perm of permissions) {
      const [permission, created] = await Permission.findOrCreate({
        where: { permission_code: perm.permission_code },
        defaults: perm,
        transaction
      });
      
      if (!created) {
        // Update existing permission if needed
        await permission.update(perm, { transaction });
      }
    }
    
    console.log(`✅ Synced ${permissions.length} permissions`);
    return await Permission.findAll({ transaction });
  }

  // Sync roles and their permissions
  async syncRoles(transaction) {
    console.log('🔐 Syncing Roles and Permissions...');
    const rolePermissions = this.getRolePermissions();
    const allPermissions = await Permission.findAll({ transaction });
    
    for (const [roleKey, roleData] of Object.entries(rolePermissions)) {
      // Find or create role
      const [role, created] = await Role.findOrCreate({
        where: { role_code: roleData.role_code },
        defaults: {
          role_name: roleData.role_name,
          permissions: roleData.permissions
        },
        transaction
      });
      
      if (!created) {
        // Update existing role
        await role.update({ 
          role_name: roleData.role_name,
          permissions: roleData.permissions 
        }, { transaction });
      }
      
      // Get permission IDs for this role
      const permissionIds = allPermissions
        .filter(p => roleData.permissions.includes(p.permission_code))
        .map(p => p.permission_id);
      
      // Sync role-permission associations
      await RolePermission.destroy({
        where: { role_id: role.role_id },
        transaction
      });
      
      if (permissionIds.length > 0) {
        await RolePermission.bulkCreate(
          permissionIds.map(permission_id => ({
            role_id: role.role_id,
            permission_id
          })),
          { transaction }
        );
      }
      
      console.log(`  ${created ? 'Created' : 'Updated'} role: ${roleData.role_code} with ${permissionIds.length} permissions`);
    }
  }

  // Add new permission to existing roles
  async addPermissionToRole(permissionCode, roleCode, transaction) {
    const permission = await Permission.findOne({ 
      where: { permission_code: permissionCode },
      transaction 
    });
    
    if (!permission) {
      throw new Error(`Permission ${permissionCode} not found`);
    }
    
    const role = await Role.findOne({ 
      where: { role_code: roleCode },
      transaction 
    });
    
    if (!role) {
      throw new Error(`Role ${roleCode} not found`);
    }
    
    // Check if association already exists
    const existing = await RolePermission.findOne({
      where: {
        role_id: role.role_id,
        permission_id: permission.permission_id
      },
      transaction
    });
    
    if (!existing) {
      await RolePermission.create({
        role_id: role.role_id,
        permission_id: permission.permission_id
      }, { transaction });
      
      // Update role's permissions JSON field
      const currentPermissions = role.permissions || [];
      if (!currentPermissions.includes(permissionCode)) {
        currentPermissions.push(permissionCode);
        await role.update({ permissions: currentPermissions }, { transaction });
      }
      
      console.log(`✅ Added permission ${permissionCode} to role ${roleCode}`);
    }
    
    return true;
  }

  // Remove permission from role
  async removePermissionFromRole(permissionCode, roleCode, transaction) {
    const permission = await Permission.findOne({ 
      where: { permission_code: permissionCode },
      transaction 
    });
    
    if (!permission) return false;
    
    const role = await Role.findOne({ 
      where: { role_code: roleCode },
      transaction 
    });
    
    if (!role) return false;
    
    await RolePermission.destroy({
      where: {
        role_id: role.role_id,
        permission_id: permission.permission_id
      },
      transaction
    });
    
    // Update role's permissions JSON field
    const currentPermissions = role.permissions || [];
    const updatedPermissions = currentPermissions.filter(p => p !== permissionCode);
    await role.update({ permissions: updatedPermissions }, { transaction });
    
    console.log(`✅ Removed permission ${permissionCode} from role ${roleCode}`);
    return true;
  }

  // Get all permissions for a specific role
  async getRolePermissions(roleCode) {
    const role = await Role.findOne({
      where: { role_code: roleCode },
      include: [{
        model: Permission,
        as: 'granted_permissions',
        through: { attributes: [] }
      }]
    });
    
    return role ? role.granted_permissions : [];
  }

  // Main run method
  async run() {
    const transaction = await sequelize.transaction();
    try {
      await this.syncPermissions(transaction);
      await this.syncRoles(transaction);
      
      await transaction.commit();
      console.log('✅ Permissions and roles seeded successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Permission seeding failed:', error);
      throw error;
    }
  }
}

export default new PermissionSeeder();