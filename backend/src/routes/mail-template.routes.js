import express from 'express';
import { createMailTemplate, deleteMailTemplate, listMailTemplates, updateMailTemplate } from '../controllers/mail-template.controller.js';
import { decryptRequest } from '../middlewares/encryption.middleware.js';
import { requireCompanyAccess, requireRecruiter } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireCompanyAccess('candidates'), listMailTemplates);
router.post('/', requireRecruiter, decryptRequest, createMailTemplate);
router.put('/:id', requireRecruiter, decryptRequest, updateMailTemplate);
router.delete('/:id', requireRecruiter, deleteMailTemplate);

export default router;