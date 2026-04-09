import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

export class Person extends Model {}

Person.init({
  person_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
// Inside Person.init
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
  email: {
    type: DataTypes.STRING(190),
    unique: true,
    validate: {
      isEmail: true 
      
    }
  },
  photo_url: { type: DataTypes.STRING(255) }
}, {
  sequelize,
  modelName: 'person',
  tableName: 'persons',
  paranoid: true,
  underscored: true
});
