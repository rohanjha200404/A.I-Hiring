import { User } from '../models/user.model.js';
import { getOrCreateCompanySettings } from '../utils/company-settings.util.js';

const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const settingsResponse = (settings) => ({
  companyName: settings.companyName,
  employeeEmailDomain: settings.employeeEmailDomain,
});

export const getCompanySettings = async (req, res) => {
  try {
    const admin = await User.findByPk(req.auth.companyAdminId || req.auth.id);
    if (!admin || !['HR', 'Admin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Company admin account required' });
    }

    res.json(settingsResponse(await getOrCreateCompanySettings(admin)));
  } catch (error) {
    res.status(500).json({ message: 'Could not load company settings', error: error.message });
  }
};

export const updateCompanySettings = async (req, res) => {
  try {
    const admin = await User.findByPk(req.auth.companyAdminId || req.auth.id);
    if (!admin || !['HR', 'Admin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Company admin account required' });
    }

    const companyName = req.body.companyName?.trim();
    const employeeEmailDomain = req.body.employeeEmailDomain?.trim().toLowerCase().replace(/^@/, '');

    if (!companyName) return res.status(400).json({ message: 'Company name is required' });
    if (!employeeEmailDomain || !domainPattern.test(employeeEmailDomain)) {
      return res.status(400).json({ message: 'Enter a valid company email domain, such as company.com' });
    }

    const settings = await getOrCreateCompanySettings(admin);
    await settings.update({ companyName, employeeEmailDomain });
    await admin.update({ name: companyName });
    res.json(settingsResponse(settings));
  } catch (error) {
    res.status(500).json({ message: 'Could not save company settings', error: error.message });
  }
};