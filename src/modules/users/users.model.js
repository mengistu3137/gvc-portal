import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

export class User extends Model {}

User.init({
  user_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  // Profile identity fields
first_name: {
  type: DataTypes.STRING(35), // International standard (UK)
  allowNull: false,
  validate: {
    len: [2, 35], // Min 2, Max 35
    is: /^[a-zA-Z\s'-]+$/i, // Allows names like "O'Connor" or "Smith-Jones"
  }
},
middle_name: {
  type: DataTypes.STRING(35),
  allowNull: true,
  validate: {
    len: [0, 35]
  }
},
last_name: {
  type: DataTypes.STRING(35),
  allowNull: false,
  validate: {
    len: [2, 35],
    is: /^[a-zA-Z\s'-]+$/i,
  }
},
  gender: { type: DataTypes.ENUM('M', 'F') },
  date_of_birth: { type: DataTypes.DATEONLY },
  phone: { type: DataTypes.STRING(30) },

  photo_url: { type: DataTypes.STRING(255) }
}, {
  sequelize,
  modelName: 'user',
  tableName: 'users',
  paranoid: true,
  underscored: true
});
