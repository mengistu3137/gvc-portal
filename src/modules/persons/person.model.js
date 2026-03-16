import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

export class Person extends Model {}

Person.init({
  person_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  first_name: { type: DataTypes.STRING(80), allowNull: false },
  middle_name: { type: DataTypes.STRING(80) },
  last_name: { type: DataTypes.STRING(80), allowNull: false },
  gender: { type: DataTypes.ENUM('M', 'F') },
  date_of_birth: { type: DataTypes.DATEONLY },
  phone: { type: DataTypes.STRING(30) },
  email: { type: DataTypes.STRING(190), validate: { isEmail: true } },
  photo_url: { type: DataTypes.STRING(255) }
}, {
  sequelize,
  modelName: 'person',
  tableName: 'persons',
  paranoid: true,
  underscored: true
});
