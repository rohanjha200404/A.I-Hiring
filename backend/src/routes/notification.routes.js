import express from 'express';
import { listNotifications, markNotificationRead } from '../controllers/notification.controller.js';
import { requireCompanyAccess } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireCompanyAccess(['jobs', 'candidates']), listNotifications);
router.patch('/:id/read', requireCompanyAccess(['jobs', 'candidates']), markNotificationRead);

export default router;