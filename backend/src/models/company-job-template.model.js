import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const CompanyJobTemplate = sequelize.define('CompanyJobTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  companyAdminId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
}, {
  timestamps: true,
});