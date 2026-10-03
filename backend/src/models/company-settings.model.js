import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const CompanySettings = sequelize.define('CompanySettings', {
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
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  employeeEmailDomain: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  defaultEmployeePermissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['jobs'],
  },
}, {
  timestamps: true,
});