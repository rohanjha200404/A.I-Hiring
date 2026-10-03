import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
  },
  experience_required: {
    type: DataTypes.INTEGER, // Years of experience
    defaultValue: 0,
  },
  course_required: {
    type: DataTypes.STRING, // e.g., 'BTech Computer Science'
  },
  skills_required: {
    type: DataTypes.TEXT, // Comma separated list of skills
  }
}, {
  timestamps: true,
});
