import { CompanySettings } from '../models/company-settings.model.js';

export const defaultDomainFromCompanyName = (name) => {
  const slug = (name || 'company')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'company';
  return `${slug}.com`;
};

export const getOrCreateCompanySettings = async (admin) => {
  const [settings] = await CompanySettings.findOrCreate({
    where: { companyAdminId: admin.id },
    defaults: {
      companyAdminId: admin.id,
      companyName: admin.name,
      employeeEmailDomain: defaultDomainFromCompanyName(admin.name),
      defaultEmployeePermissions: ['jobs'],
    },
  });
  return settings;
};