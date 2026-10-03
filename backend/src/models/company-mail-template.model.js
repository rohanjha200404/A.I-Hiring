import { DataTypes } from 'sequelize';
import { sequelize } from '../core/db.js';

export const CompanyMailTemplate = sequelize.define('CompanyMailTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  companyAdminId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  templateKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  timestamps: true,
  indexes: [{ unique: true, fields: ['companyAdminId', 'templateKey'] }],
});