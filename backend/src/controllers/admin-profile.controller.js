import { User } from '../models/user.model.js';
import { Employee } from '../models/employee.model.js';
import { CompanyAdminProfile } from '../models/company-admin-profile.model.js';

const findAdmin = async (adminId) => User.findOne({ where: { id: adminId, role: ['HR', 'Admin'] } });

export const getAdminProfile = async (req, res) => {
  try {
    const admin = await findAdmin(req.auth.id);
    if (!admin) return res.status(403).json({ message: 'Company admin account required' });
    const [profile] = await CompanyAdminProfile.findOrCreate({
      where: { adminId: admin.id },
      defaults: { adminId: admin.id, phoneNumber: '' },
    });
    res.json({ id: admin.id, name: admin.name, email: admin.email, phoneNumber: profile.phoneNumber });
  } catch (error) {
    res.status(500).json({ message: 'Could not load profile', error: error.message });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const admin = await findAdmin(req.auth.id);
    if (!admin) return res.status(403).json({ message: 'Company admin account required' });

    const email = req.body.email?.trim().toLowerCase();
    const phoneNumber = req.body.phoneNumber?.trim() || '';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (phoneNumber && !/^[+()\d\s.-]{7,25}$/.test(phoneNumber)) {
      return res.status(400).json({ message: 'Enter a valid phone number' });
    }

    if (email !== admin.email) {
      const [existingUser, existingEmployee] = await Promise.all([
        User.findOne({ where: { email } }),
        Employee.findOne({ where: { email } }),
      ]);
      if (existingUser || existingEmployee) return res.status(409).json({ message: 'That email is already in use' });
    }

    const [profile] = await CompanyAdminProfile.findOrCreate({
      where: { adminId: admin.id },
      defaults: { adminId: admin.id, phoneNumber },
    });
    await Promise.all([admin.update({ email }), profile.update({ phoneNumber })]);
    res.json({ id: admin.id, name: admin.name, email: admin.email, phoneNumber: profile.phoneNumber });
  } catch (error) {
    res.status(500).json({ message: 'Could not update profile', error: error.message });
  }
};