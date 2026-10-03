import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { parseResume, viewCandidateResume } from '../controllers/resume.controller.js';
import { requireCandidate, requireCompanyAccess } from '../middlewares/auth.middleware.js';
import { resumeUploadDir } from '../utils/upload.paths.js';

if (!fs.existsSync(resumeUploadDir)) {
    fs.mkdirSync(resumeUploadDir, { recursive: true });
}

const upload = multer({
    dest: resumeUploadDir,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) {
            return callback(new Error('Only PDF resumes are supported'));
        }
        callback(null, true);
    },
});
const router = express.Router();

// Candidate uploads resume
router.post('/upload', requireCandidate, upload.single('file'), parseResume);
router.get('/:candidateId', requireCompanyAccess('candidates'), viewCandidateResume);

export default router;
