import { JobUploadHistory } from '../models/job-upload-history.model.js';

export const listJobUploadHistory = async (req, res) => {
  try {
    const companyAdminId = req.auth.companyAdminId || req.auth.id;
    const history = await JobUploadHistory.findAll({
      where: { companyAdminId },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Could not load job upload history', error: error.message });
  }
};
