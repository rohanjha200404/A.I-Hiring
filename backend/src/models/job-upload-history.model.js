import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const JobUploadHistory = sequelize.define('JobUploadHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  companyAdminId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  uploadedById: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  uploadedByName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uploadType: {
    type: DataTypes.ENUM('template', 'jobs'),
    allowNull: false,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('processing', 'success', 'failed'),
    allowNull: false,
    defaultValue: 'processing',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rowCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  timestamps: true,
});
