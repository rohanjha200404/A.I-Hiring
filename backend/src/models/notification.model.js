import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  companyAdminId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  recipientId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  audience: {
    type: DataTypes.ENUM('recruiter', 'candidate'),
    allowNull: false,
    defaultValue: 'recruiter',
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});