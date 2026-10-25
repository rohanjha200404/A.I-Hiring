import express from 'express';
import { createEmailLog, listActivityLogs } from '../controllers/activity-log.controller.js';
import { requireCompanyAccess } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireCompanyAccess('settings'), listActivityLogs);
router.post('/email', requireCompanyAccess(['candidates', 'settings']), createEmailLog);

export default router;
