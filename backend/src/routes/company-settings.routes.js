import express from 'express';
import { getCompanySettings, updateCompanySettings } from '../controllers/company-settings.controller.js';
import { decryptRequest } from '../middlewares/encryption.middleware.js';
import { requireCompanyAccess } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireCompanyAccess('settings'), getCompanySettings);
router.put('/', requireCompanyAccess('settings'), decryptRequest, updateCompanySettings);

export default router;