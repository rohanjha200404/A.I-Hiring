import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { uploadJobsCSV, uploadJobTemplate, downloadTemplate, listJobs, updateJob, deleteJob } from '../controllers/job.controller.js';
import { decryptRequest } from '../middlewares/encryption.middleware.js';
import { requireCompanyAccess, requireRecruiter } from '../middlewares/auth.middleware.js';

// Ensure uploads directory exists
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (req, _file, callback) => {
        const filename = `${randomUUID()}.csv`;
        req.jobUploadPath = path.join(uploadDir, filename);
        callback(null, filename);
    },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
const templateUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
            return callback(new Error('Only CSV templates are supported'));
        }
        callback(null, true);
    },
});
const router = express.Router();

const receiveJobsCsv = (req, res, next) => {
    req.once('aborted', () => {
        if (req.jobUploadPath) fs.unlink(req.jobUploadPath, () => {});
    });

    upload.single('file')(req, res, (error) => {
        if (error) {
            if (req.jobUploadPath) fs.unlink(req.jobUploadPath, () => {});
            if (error instanceof multer.MulterError) {
                return res.status(400).json({ message: 'CSV upload failed. The file may exceed the 20 MB limit.' });
            }
            return next(error);
        }

        if (req.aborted) {
            if (req.jobUploadPath) fs.unlink(req.jobUploadPath, () => {});
            return;
        }

        next();
    });
};

router.post('/upload', requireCompanyAccess('jobs'), receiveJobsCsv, uploadJobsCSV);
router.get('/template', requireCompanyAccess('jobs'), downloadTemplate);
router.post('/template', requireRecruiter, templateUpload.single('file'), uploadJobTemplate);
router.get('/', requireCompanyAccess('jobs'), listJobs);
router.put('/:id', requireCompanyAccess('jobs'), decryptRequest, updateJob);
router.delete('/:id', requireCompanyAccess('jobs'), deleteJob);

export default router;
