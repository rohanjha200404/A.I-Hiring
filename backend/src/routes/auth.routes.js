import express from 'express';
import { register, registerRecruiter, login, forgotPassword, verifyOTPAndResetPassword, changeRecruiterPassword } from '../controllers/auth.controller.js';
import { getPublicKey } from '../utils/crypto.util.js';
import { decryptRequest } from '../middlewares/encryption.middleware.js';
import { requireRecruiter } from '../middlewares/auth.middleware.js';
import { getAdminProfile, updateAdminProfile } from '../controllers/admin-profile.controller.js';

const router = express.Router();

// Endpoint for frontend to fetch the public RSA key
router.get('/public-key', (req, res) => {
  res.json({ publicKey: getPublicKey() });
});

// Apply decryption middleware to endpoints that receive sensitive data
router.post('/register', decryptRequest, register);
router.post('/register/recruiter', decryptRequest, registerRecruiter);
router.post('/login', decryptRequest, login);
router.post('/forgot-password', decryptRequest, forgotPassword);
router.post('/reset-password', decryptRequest, verifyOTPAndResetPassword);
router.put('/password', requireRecruiter, decryptRequest, changeRecruiterPassword);
router.get('/profile', requireRecruiter, getAdminProfile);
router.put('/profile', requireRecruiter, decryptRequest, updateAdminProfile);

export default router;
