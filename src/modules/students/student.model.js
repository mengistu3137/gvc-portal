import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Occupation, Level, Batch } from '../academics/academic.model.js';
import { Person } from '../persons/person.model.js';

export class StudentIdSequence extends Model {}
StudentIdSequence.init({
  reg_year: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true },
  last_seq: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 }
}, { sequelize, modelName: 'student_id_sequence', tableName: 'student_id_sequences', timestamps: false });

export class Student extends Model {}
Student.init({
  student_pk: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  person_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    unique: true,
    references: { model: 'persons', key: 'person_id' }
  },
  student_id: { type: DataTypes.STRING(30),unique: true, allowNull: false },
  reg_year: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
  reg_sequence: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  
  // These will be inherited from the Batch during creation
  occupation_id: { type: DataTypes.INTEGER, allowNull: false },
  level_id: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  admission_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'GRADUATED', 'DROPPED'), defaultValue: 'ACTIVE' }
}, { 
  sequelize, 
  modelName: 'student', 
  tableName: 'students', 
  paranoid: true, 
  underscored: true 
});

// Relationships based on your Academic Model
Person.hasOne(Student, { foreignKey: 'person_id', as: 'student_profile' });
Student.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });

Student.belongsTo(Occupation, { foreignKey: 'occupation_id', as: 'occupation' });
Student.belongsTo(Level, { foreignKey: 'level_id', as: 'level' });
Student.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });