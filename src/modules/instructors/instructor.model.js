import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { UserAccount } from '../auth/auth.model.js';
import { Occupation } from '../academics/academic.model.js';

export class Instructor extends Model {}
Instructor.init({
  instructor_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  staff_code: { type: DataTypes.STRING(50), unique: true, allowNull: false }, // e.g., GVC/INST/001
  full_name: { type: DataTypes.STRING(180), allowNull: false },
  employment_status: { 
    type: DataTypes.ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE'), 
    defaultValue: 'ACTIVE' 
  }
}, { 
  sequelize, 
  modelName: 'instructor', 
  tableName: 'instructors', 
  paranoid: true // Historical tracking of former staff
});

// Relationships
// NOTE: `user_id` and `occupation_id` columns are not defined on `Instructor` above.
// Keep these associations commented out until the model/schema includes those fields
// or re-add them after adding the corresponding columns to avoid Sequelize
// expecting missing foreign-key columns.