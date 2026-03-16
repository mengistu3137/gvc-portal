import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Occupation } from '../academics/academic.model.js';
import { Person } from '../persons/person.model.js';

export class Instructor extends Model {}
Instructor.init({
  instructor_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  person_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    unique: true,
    references: { model: 'persons', key: 'person_id' }
  },
  staff_code: { type: DataTypes.STRING(50), unique: true, allowNull: false }, // e.g., GVC/INST/001
  occupation_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'occupations', key: 'occupation_id' }
  },
  hire_date: { type: DataTypes.DATEONLY },
  qualification: { type: DataTypes.STRING(180) },
  employment_status: { 
    type: DataTypes.ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE'), 
    defaultValue: 'ACTIVE' 
  }
}, { 
  sequelize, 
  modelName: 'instructor', 
  tableName: 'instructors', 
  paranoid: true,
  underscored: true
});

// Relationships
Person.hasOne(Instructor, { foreignKey: 'person_id', as: 'instructor_profile' });
Instructor.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });
Instructor.belongsTo(Occupation, { foreignKey: 'occupation_id', as: 'occupation' });