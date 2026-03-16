import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { Person } from '../persons/person.model.js';

export class Staff extends Model {}

Staff.init({
  staff_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  person_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    unique: true,
    references: { model: 'persons', key: 'person_id' }
  },
  staff_type: {
    type: DataTypes.ENUM('FINANCE', 'REGISTRAR', 'QA', 'ADMIN'),
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
