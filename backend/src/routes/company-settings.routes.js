import express from 'express';
import { getCompanySettings, updateCompanySettings } from '../controllers/company-settings.controller.js';
import { decryptRequest } from '../middlewares/encryption.middleware.js';
import { requireRecruiter } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireRecruiter, getCompanySettings);
router.put('/', requireRecruiter, decryptRequest, updateCompanySettings);

export default router;