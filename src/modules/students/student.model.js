import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js'; // Note the .js extension

export class StudentSequence extends Model {}
StudentSequence.init({
  year_id: { type: DataTypes.INTEGER, primaryKey: true },
  current_val: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { sequelize, modelName: 'student_sequence', timestamps: false });

export class Student extends Model {}
Student.init({
  student_id: { 
    type: DataTypes.STRING(20), 
    primaryKey: true 
  },
  full_name: { type: DataTypes.STRING(150), allowNull: false },
  gender: { type: DataTypes.ENUM('M', 'F'), allowNull: false },
  phone_number: { type: DataTypes.STRING(15), unique: true },
  educational_stream: { 
    type: DataTypes.ENUM('Social', 'Natural', 'Bsc', 'Diploma'), 
    allowNull: false 
  },
  status: { 
    type: DataTypes.ENUM('Active', 'Leave', 'Graduated', 'Dropped'), 
    defaultValue: 'Active' 
  }
}, { 
  sequelize, 
  modelName: 'student',
  paranoid: true
});