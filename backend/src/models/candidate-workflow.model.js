import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const CandidateWorkflow = sequelize.define('CandidateWorkflow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  stage: {
    type: DataTypes.ENUM('Pending', 'Interview', 'Hired', 'Rejected'),
    allowNull: false,
    defaultValue: 'Pending',
  },
  outreachStatus: {
    type: DataTypes.ENUM('Pending', 'Contacted'),
    allowNull: false,
    defaultValue: 'Pending',
  },
  lastContactedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});