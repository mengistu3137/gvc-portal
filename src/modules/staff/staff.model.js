import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Person } from '../persons/person.model.js';

export class StaffIdSequence extends Model {}

StaffIdSequence.init({
  category: {
    type: DataTypes.ENUM('INST', 'STF'),
    primaryKey: true,
    allowNull: false
  },
  reg_year: {
    type: DataTypes.SMALLINT.UNSIGNED,
    primaryKey: true,
    allowNull: false
  },
  last_seq: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'staff_id_sequence',
  tableName: 'staff_id_sequences',
  timestamps: false
});

export class Staff extends Model {}

Staff.init({
  staff_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  person_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    unique: true,
  
    
    references: { model: 'persons', key: 'person_id' }
  },
  staff_code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [4, 30]
    }
  },
  staff_type: {
    type: DataTypes.ENUM('STAFF', 'REGISTRAR', 'QA','ADMIN'),
    allowNull: false
  },
  employment_status: {
    type: DataTypes.ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE'),
    defaultValue: 'ACTIVE'
  }
}, {
  sequelize,
  modelName: 'staff',
  tableName: 'staff',
  paranoid: true,
  underscored: true
});

Person.hasOne(Staff, { foreignKey: 'person_id', as: 'staff' });
Staff.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });
