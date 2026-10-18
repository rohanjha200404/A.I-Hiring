import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { Employee } from '../models/employee.model.js';
import { User } from '../models/user.model.js';
import { getOrCreateCompanySettings } from '../utils/company-settings.util.js';

const allowedPermissions = new Set(['jobs', 'candidates', 'accounts', 'settings']);

const employeeResponse = (employee) => ({
  id: employee.id,
  employeeId: employee.employeeId,
  companyName: employee.companyName,
  name: employee.name,
  position: employee.position,
  email: employee.email,
  permissions: employee.permissions,
  createdAt: employee.createdAt,
});

export const listEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: { companyAdminId: req.auth.companyAdminId || req.auth.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(employees.map(employeeResponse));
  } catch (error) {
    res.status(500).json({ message: 'Could not load employees', error: error.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const admin = await User.findByPk(req.auth.companyAdminId || req.auth.id);
    if (!admin || !['HR', 'Admin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Company admin account required' });
    }

    const settings = await getOrCreateCompanySettings(admin);
    const name = req.body.name?.trim();
    const employeeId = req.body.employeeId?.trim();
    const position = req.body.position?.trim();
    const password = req.body.password;
    const requestedPermissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const requestedAccess = [...new Set(requestedPermissions.filter((permission) => allowedPermissions.has(permission)))];
    const firstName = name?.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const emailLocalPart = `${firstName || ''}${employeeId?.toLowerCase().replace(/[^a-z0-9._-]/g, '') || ''}`;

    if (!name || !employeeId || !/^[a-zA-Z0-9_-]+$/.test(employeeId) || !position) {
      return res.status(400).json({ message: 'Enter a name, position and a valid employee ID (letters, numbers, hyphens or underscores)' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Employee password must be at least 8 characters' });
    }
    if (!settings.employeeEmailDomain || !emailLocalPart) {
      return res.status(400).json({ message: 'Could not generate a company login email' });
    }
    if (requestedAccess.length === 0) {
      return res.status(400).json({ message: 'Select at least one dashboard area for this employee' });
    }
    const email = `${emailLocalPart}@${settings.employeeEmailDomain}`;
    const existingAccount = await Employee.findOne({ where: { [Op.or]: [{ email }, { companyAdminId: admin.id, employeeId }] } });
    const existingUser = await User.findOne({ where: { email } });
    if (existingAccount || existingUser) {
      return res.status(409).json({ message: 'That employee ID or generated email is already in use' });
    }

    const employee = await Employee.create({
      companyAdminId: admin.id,
      employeeId,
      position,
      companyName: settings.companyName,
      name,
      email,
      password: await bcrypt.hash(password, 10),
      permissions: requestedAccess,
    });

    res.status(201).json(employeeResponse(employee));
  } catch (error) {
    res.status(500).json({ message: 'Could not create employee account', error: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const admin = await User.findByPk(req.auth.companyAdminId || req.auth.id);
    if (!admin || !['HR', 'Admin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Company admin account required' });
    }

    const employee = await Employee.findOne({ where: { id: req.params.id, companyAdminId: admin.id } });
    if (!employee) return res.status(404).json({ message: 'Employee account not found' });

    const settings = await getOrCreateCompanySettings(admin);
    const name = req.body.name?.trim();
    const employeeId = req.body.employeeId?.trim();
    const position = req.body.position?.trim();
    const password = req.body.password;
    const requestedPermissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const requestedAccess = [...new Set(requestedPermissions.filter((permission) => allowedPermissions.has(permission)))];
    const firstName = name?.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const emailLocalPart = `${firstName || ''}${employeeId?.toLowerCase().replace(/[^a-z0-9._-]/g, '') || ''}`;

    if (!name || !employeeId || !/^[a-zA-Z0-9_-]+$/.test(employeeId) || !position) {
      return res.status(400).json({ message: 'Enter a name, position and a valid employee ID (letters, numbers, hyphens or underscores)' });
    }
    if (password && password.length < 8) {
      return res.status(400).json({ message: 'Employee password must be at least 8 characters' });
    }
    if (!settings.employeeEmailDomain || !emailLocalPart) {
      return res.status(400).json({ message: 'Could not generate a company login email' });
    }
    if (requestedAccess.length === 0) {
      return res.status(400).json({ message: 'Select at least one dashboard area for this employee' });
    }

    const email = `${emailLocalPart}@${settings.employeeEmailDomain}`;
    const existingAccount = await Employee.findOne({ where: { [Op.or]: [{ email }, { companyAdminId: admin.id, employeeId }], id: { [Op.ne]: employee.id } } });
    const existingUser = await User.findOne({ where: { email } });
    if (existingAccount || existingUser) {
      return res.status(409).json({ message: 'That employee ID or generated email is already in use' });
    }

    const updates = { employeeId, position, name, email, permissions: requestedAccess };
    if (password) updates.password = await bcrypt.hash(password, 10);
    await employee.update(updates);
    res.json(employeeResponse(employee));
  } catch (error) {
    res.status(500).json({ message: 'Could not update employee account', error: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ where: { id: req.params.id, companyAdminId: req.auth.companyAdminId || req.auth.id } });
    if (!employee) return res.status(404).json({ message: 'Employee account not found' });

    await employee.destroy();
    res.json({ message: 'Employee account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete employee account', error: error.message });
  }
};