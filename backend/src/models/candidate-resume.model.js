import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const CandidateResume = sequelize.define('CandidateResume', {
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
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mappedCourse: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  yearsExperience: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  matchScore: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true,
});