import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const ActivityLog = sequelize.define('ActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  companyAdminId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('email', 'login', 'employee'),
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  targetName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  performedByName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  details: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
}, {
  timestamps: true,
});
