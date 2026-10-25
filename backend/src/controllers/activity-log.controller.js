import { ActivityLog } from '../models/activity-log.model.js';
import { Employee } from '../models/employee.model.js';
import { User } from '../models/user.model.js';

const companyAdminIdFor = (req) => req.auth.companyAdminId || req.auth.id;

const actorName = async (req) => {
  if (req.auth.role === 'Employee') {
    const employee = await Employee.findByPk(req.auth.id, { attributes: ['name'] });
    return employee?.name || 'Employee';
  }
  const user = await User.findByPk(req.auth.id, { attributes: ['name'] });
  return user?.name || 'Recruiter';
};

export const listActivityLogs = async (req, res) => {
  try {
    const category = ['email', 'login', 'employee'].includes(req.query.category) ? req.query.category : 'email';
    const logs = await ActivityLog.findAll({
      where: { companyAdminId: companyAdminIdFor(req), category },
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Could not load activity logs', error: error.message });
  }
};

export const createEmailLog = async (req, res) => {
  try {
    const log = await ActivityLog.create({
      companyAdminId: companyAdminIdFor(req),
      category: 'email',
      action: 'EMAIL_SENT',
      targetName: req.body.candidateName?.trim() || 'Candidate',
      performedByName: await actorName(req),
      details: {
        recipientEmail: req.body.candidateEmail || '',
        subject: req.body.subject || '',
        templateName: req.body.templateName || 'Direct Outreach',
      },
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ message: 'Could not record email log', error: error.message });
  }
};
