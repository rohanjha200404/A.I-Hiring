import jwt from 'jsonwebtoken';
import { Employee } from '../models/employee.model.js';

const requireRoles = (roles) => (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (!roles.includes(payload.role)) {
      return res.status(403).json({ message: 'You do not have access to this resource' });
    }
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
};

export const requireRecruiter = requireRoles(['HR', 'Admin']);
export const requireCandidate = requireRoles(['Candidate']);

export const requireCompanyAccess = (permission) => async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }

  if (['HR', 'Admin'].includes(payload.role)) {
    req.auth = payload;
    return next();
  }
  if (payload.role !== 'Employee') {
    return res.status(403).json({ message: 'Company dashboard access required' });
  }

  try {
    const employee = await Employee.findByPk(payload.id);
    if (!employee) return res.status(401).json({ message: 'Employee account no longer exists' });
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];
    if (!requiredPermissions.some((requiredPermission) => employee.permissions.includes(requiredPermission))) {
      return res.status(403).json({ message: 'Your account does not have access to this tab' });
    }
    req.auth = { ...payload, companyAdminId: employee.companyAdminId, permissions: employee.permissions };
    next();
  } catch (error) {
    res.status(500).json({ message: 'Could not verify employee access', error: error.message });
  }
};