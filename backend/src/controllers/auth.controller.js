import { User } from '../models/user.model.js';
import { Employee } from '../models/employee.model.js';
import { Notification } from '../models/notification.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Development mode OTP generator
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const createAccount = async (req, res, role) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    const existingEmployee = await Employee.findOne({ where: { email } });
    if (existingUser || existingEmployee) return res.status(400).json({ message: 'Email already in use' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    if (role === 'Candidate') {
      try {
        await Notification.create({
          companyAdminId: null,
          type: 'candidate',
          title: 'New candidate registered',
          message: `${user.name} created a candidate account.`,
        });
      } catch (notificationError) {
        console.error('Could not create candidate notification:', notificationError.message);
      }
    }

    res.status(201).json({ message: 'Registration successful', userId: user.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const register = (req, res) => createAccount(req, res, 'Candidate');
export const registerRecruiter = (req, res) => createAccount(req, res, 'HR');

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email } });
    const employee = user ? null : await Employee.findOne({ where: { email } });
    const account = user || employee;
    if (!account) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const role = user ? user.role : 'Employee';
    const token = jwt.sign({ id: account.id, role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    
    res.json({
      message: 'Login successful',
      token,
      user: user
        ? { id: user.id, name: user.name, role, email: user.email }
        : { id: employee.id, name: employee.name, role, email: employee.email, employeeId: employee.employeeId, companyName: employee.companyName, permissions: employee.permissions },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    user.otp = otp;
    await user.save();

    // Dev mode: return OTP in response
    res.json({ message: 'OTP generated successfully', dev_otp: otp });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null; // clear OTP
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const changeRecruiterPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const recruiter = await User.findByPk(req.auth.id);
    if (!recruiter || !['HR', 'Admin'].includes(recruiter.role)) {
      return res.status(403).json({ message: 'Company admin account required' });
    }
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Enter your current password and a new password of at least 8 characters' });
    }

    const matches = await bcrypt.compare(currentPassword, recruiter.password);
    if (!matches) return res.status(400).json({ message: 'Current password is incorrect' });

    recruiter.password = await bcrypt.hash(newPassword, 10);
    await recruiter.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Could not update password', error: error.message });
  }
};
