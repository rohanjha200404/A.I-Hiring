import { Op } from 'sequelize';
import { Notification } from '../models/notification.model.js';

const notificationScope = (req) => {
  if (req.auth.role === 'Candidate') {
    return {
      where: {
        audience: 'candidate',
        recipientId: req.auth.id,
      },
    };
  }

  const companyAdminId = req.auth.companyAdminId || req.auth.id;
  const allowedTypes = req.auth.role === 'HR' || req.auth.role === 'Admin'
    ? ['job', 'candidate']
    : [
      ...(req.auth.permissions.includes('jobs') ? ['job'] : []),
      ...(req.auth.permissions.includes('candidates') ? ['candidate'] : []),
    ];

  return {
    where: {
      audience: 'recruiter',
      type: { [Op.in]: allowedTypes },
      [Op.or]: [{ companyAdminId }, { companyAdminId: null }],
    },
  };
};

export const listNotifications = async (req, res) => {
  try {
    const { where } = notificationScope(req);
    if (where.type?.[Op.in]?.length === 0) return res.json([]);

    const notifications = await Notification.findAll({
      where,
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
    const { where } = notificationScope(req);
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        ...where,
      },
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    if (!notification.readAt) await notification.update({ readAt: new Date() });
    res.json({ id: notification.id, readAt: notification.readAt });
  } catch (error) {
    res.status(500).json({ message: 'Could not mark notification as read', error: error.message });
  }
};