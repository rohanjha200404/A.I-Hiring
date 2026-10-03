import { randomUUID } from 'node:crypto';
import { CompanyMailTemplate } from '../models/company-mail-template.model.js';

const defaultTemplates = [
  {
    templateKey: 'interview',
    name: 'Interview schedule',
    subject: 'Interview invitation - {{position}}',
    body: 'Hi {{candidate}},\n\nThank you for your interest in {{company}}. We would like to invite you to interview for the {{position}} role.\n\nProposed date: {{date}}\nTime: {{time}}\n\nPlease reply to confirm your availability.\n\nBest regards,\n{{company}}',
  },
  {
    templateKey: 'rejected',
    name: 'Application rejected',
    subject: 'Update on your application',
    body: 'Hi {{candidate}},\n\nThank you for applying to {{company}}. After careful consideration, we have decided not to move forward with your application for {{position}}.\n\nWe appreciate your interest and wish you the best.\n\nBest regards,\n{{company}}',
  },
  {
    templateKey: 'offer',
    name: 'Hiring offer',
    subject: 'Job offer - {{position}}',
    body: 'Hi {{candidate}},\n\nWe are pleased to offer you the {{position}} role at {{company}}. Please reply to discuss the offer and next steps.\n\nBest regards,\n{{company}}',
  },
];

const companyIdFromRequest = (req) => req.auth.companyAdminId || req.auth.id;

export const listMailTemplates = async (req, res) => {
  try {
    const companyAdminId = companyIdFromRequest(req);
    for (const template of defaultTemplates) {
      await CompanyMailTemplate.findOrCreate({
        where: { companyAdminId, templateKey: template.templateKey },
        defaults: { ...template, companyAdminId, isDefault: true },
      });
    }
    const templates = await CompanyMailTemplate.findAll({ where: { companyAdminId }, order: [['createdAt', 'ASC']] });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Could not load email templates', error: error.message });
  }
};

export const createMailTemplate = async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    if (!name?.trim() || !subject?.trim() || !body?.trim()) {
      return res.status(400).json({ message: 'Template name, subject and body are required' });
    }

    const template = await CompanyMailTemplate.create({
      companyAdminId: req.auth.id,
      templateKey: `custom-${randomUUID()}`,
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      isDefault: false,
    });
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Could not create email template', error: error.message });
  }
};

export const updateMailTemplate = async (req, res) => {
  try {
    const template = await CompanyMailTemplate.findOne({ where: { id: req.params.id, companyAdminId: req.auth.id } });
    if (!template) return res.status(404).json({ message: 'Email template not found' });

    const { name, subject, body } = req.body;
    if (!name?.trim() || !subject?.trim() || !body?.trim()) {
      return res.status(400).json({ message: 'Template name, subject and body are required' });
    }
    await template.update({ name: name.trim(), subject: subject.trim(), body: body.trim() });
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Could not update email template', error: error.message });
  }
};

export const deleteMailTemplate = async (req, res) => {
  try {
    const template = await CompanyMailTemplate.findOne({ where: { id: req.params.id, companyAdminId: req.auth.id } });
    if (!template) return res.status(404).json({ message: 'Email template not found' });
    if (template.isDefault) return res.status(400).json({ message: 'Built-in templates cannot be deleted' });

    await template.destroy();
    res.json({ message: 'Email template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete email template', error: error.message });
  }
};