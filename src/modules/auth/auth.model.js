import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Person } from '../persons/person.model.js';

export class UserAccount extends Model {}
UserAccount.init({
  user_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  person_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    unique: true,
    references: { model: 'persons', key: 'person_id' }
  },
  email: { 
    type: DataTypes.STRING(190), 
    unique: true, 
    allowNull: false,
    set(value) {
  
    this.setDataValue('email', value.toLowerCase().trim());
  },
    validate: {
      isEmail: true,
      notEmpty: true,
      len: [5, 190]
    } 
  },
  password_hash: {
    type: DataTypes.STRING(255), allowNull: false,
    validate: { notEmpty: true }
   },
  hash_algorithm: { type: DataTypes.ENUM('BCRYPT', 'ARGON2ID'), defaultValue: 'ARGON2ID' },
  status: { type: DataTypes.ENUM('ACTIVE', 'LOCKED', 'DISABLED'), defaultValue: 'ACTIVE' },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_login_at: { type: DataTypes.DATE },

  // Password reset control fields
  reset_token_hash: { type: DataTypes.STRING(255), allowNull: true },
  reset_token_expires_at: { type: DataTypes.DATE, allowNull: true },
  reset_token_sent_at: { type: DataTypes.DATE, allowNull: true }
}, { 
  sequelize, 
  modelName: 'user_account', 
  tableName: 'user_accounts', 
  paranoid: true,
  underscored: true
});

export class Role extends Model {}
Role.init({
  role_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  role_code: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  role_name: { type: DataTypes.STRING(120), allowNull: false },
  permissions: { type: DataTypes.JSON }
}, { sequelize, modelName: 'role', tableName: 'roles', timestamps: false, underscored: true });

export class Permission extends Model {}
Permission.init({
  permission_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  permission_code: { type: DataTypes.STRING(80), unique: true, allowNull: false },
  permission_name: { type: DataTypes.STRING(160), allowNull: false },
  module_scope: { type: DataTypes.STRING(80), allowNull: false }
}, { sequelize, modelName: 'permission', tableName: 'permissions', timestamps: false, underscored: true });

// Explicit join tables (no timestamps in DB)
export class UserRole extends Model {}
UserRole.init({}, { sequelize, modelName: 'user_role', tableName: 'user_roles', timestamps: false, underscored: true });

export class RolePermission extends Model {}
RolePermission.init({}, { sequelize, modelName: 'role_permission', tableName: 'role_permissions', timestamps: false, underscored: true });

// Associations
Person.hasOne(UserAccount, { foreignKey: 'person_id', as: 'account' });
UserAccount.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });

UserAccount.belongsToMany(Role, { 
  through: UserRole, foreignKey: 'user_id', otherKey: 'role_id', as: 'roles' });
Role.belongsToMany(UserAccount, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id', as: 'users' });
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', as: 'granted_permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });