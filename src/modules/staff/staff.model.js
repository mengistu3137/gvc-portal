import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { User } from '../users/users.model.js';
import { Occupation } from '../academics/academic.model.js';

// Sequence table for staff codes (optional, kept as is)
export class StaffIdSequence extends Model {}
StaffIdSequence.init({
  category: { type: DataTypes.ENUM('INST', 'STF'), primaryKey: true, allowNull: false },
  reg_year: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, allowNull: false },
  last_seq: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
}, { sequelize, modelName: 'staff_id_sequence', tableName: 'staff_id_sequences', timestamps: false });

export class Staff extends Model {}
Staff.init({
  staff_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'user_id' }
  },
  staff_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true, len: [4, 50] }
  },
 
  employment_status: {
    type: DataTypes.ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE'),
    defaultValue: 'ACTIVE'
  },

  // Instructor-specific fields (nullable for non-instructor staff)
  occupation_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'occupations', key: 'occupation_id' }
  },
  hire_date: { type: DataTypes.DATEONLY, allowNull: true },
  qualification: { type: DataTypes.STRING(180), allowNull: true },
  specializations: { type: DataTypes.JSON, allowNull: true }
}, {
  sequelize,
  modelName: 'staff',
  tableName: 'staff',
  paranoid: true,
  underscored: true
});

// Associations
User.hasOne(Staff, { foreignKey: 'user_id', as: 'staff_profile' });
Staff.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Staff.belongsTo(Occupation, { foreignKey: 'occupation_id', as: 'occupation' });