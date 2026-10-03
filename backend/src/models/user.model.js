import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('Admin', 'HR', 'Candidate'),
    defaultValue: 'Candidate',
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});
