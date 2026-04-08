import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

export class Announcement extends Model {}

Announcement.init({
  announcement_id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  title: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },
  content: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  image_url: { 
    type: DataTypes.STRING(255), 
    allowNull: true 
  },
  is_active: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  },
  published_at: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
}, { 
  sequelize, 
  modelName: 'announcement', 
  tableName: 'announcements', 
  underscored: true 
});