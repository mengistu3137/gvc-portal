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
    validate: { isEmail: true } 
  },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  hash_algorithm: { type: DataTypes.ENUM('BCRYPT', 'ARGON2ID'), defaultValue: 'ARGON2ID' },
  status: { type: DataTypes.ENUM('ACTIVE', 'LOCKED', 'DISABLED'), defaultValue: 'ACTIVE' },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_login_at: { type: DataTypes.DATE }
}, { sequelize, modelName: 'user_account', tableName: 'user_accounts', paranoid: true });

export class Role extends Model {}
Role.init({
  role_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  role_code: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  role_name: { type: DataTypes.STRING(120), allowNull: false }
}, { sequelize, modelName: 'role', tableName: 'roles', timestamps: false });

export class Permission extends Model {}
Permission.init({
  permission_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  permission_code: { type: DataTypes.STRING(80), unique: true, allowNull: false },
  permission_name: { type: DataTypes.STRING(160), allowNull: false },
  module_scope: { type: DataTypes.STRING(80), allowNull: false }
}, { sequelize, modelName: 'permission', tableName: 'permissions', timestamps: false });

// Associations
Person.hasOne(UserAccount, { foreignKey: 'person_id', as: 'account' });
UserAccount.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });

UserAccount.belongsToMany(Role, { 
  through: 'user_roles', foreignKey: 'user_id', otherKey: 'role_id', as: 'roles' });
Role.belongsToMany(UserAccount, { through: 'user_roles', foreignKey: 'role_id', otherKey: 'user_id', as: 'users' });
Role.belongsToMany(Permission, { through: 'role_permissions', foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: 'role_permissions', foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });