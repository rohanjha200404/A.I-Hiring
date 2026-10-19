import express from 'express';
import { listNotifications, markNotificationRead } from '../controllers/notification.controller.js';
import { requireNotificationAccess } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireNotificationAccess, listNotifications);
router.patch('/:id/read', requireNotificationAccess, markNotificationRead);

export default router;