import { Op } from 'sequelize';
import { Notification } from '../models/notification.model.js';

const notificationScope = (req) => {
  const companyAdminId = req.auth.companyAdminId || req.auth.id;
  const allowedTypes = req.auth.role === 'HR' || req.auth.role === 'Admin'
    ? ['job', 'candidate']
    : [
      ...(req.auth.permissions.includes('jobs') ? ['job'] : []),
      ...(req.auth.permissions.includes('candidates') ? ['candidate'] : []),
    ];

  return { companyAdminId, allowedTypes };
};

export const listNotifications = async (req, res) => {
  try {
    const { companyAdminId, allowedTypes } = notificationScope(req);
    if (allowedTypes.length === 0) return res.json([]);

    const notifications = await Notification.findAll({
      where: {
        type: { [Op.in]: allowedTypes },
        [Op.or]: [{ companyAdminId }, { companyAdminId: null }],
      },
      order: [['createdAt', 'DESC']],
      limit: 30,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Could not load notifications', error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { companyAdminId, allowedTypes } = notificationScope(req);
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        type: { [Op.in]: allowedTypes },
        [Op.or]: [{ companyAdminId }, { companyAdminId: null }],
      },
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    if (!notification.readAt) await notification.update({ readAt: new Date() });
    res.json({ id: notification.id, readAt: notification.readAt });
  } catch (error) {
    res.status(500).json({ message: 'Could not mark notification as read', error: error.message });
  }
};