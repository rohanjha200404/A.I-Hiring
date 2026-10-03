import express from 'express';
import { listCandidates, updateCandidate, deleteCandidate, updateCandidateWorkflow } from '../controllers/user.controller.js';
import { requireCompanyAccess, requireRecruiter } from '../middlewares/auth.middleware.js';
import { decryptRequest } from '../middlewares/encryption.middleware.js';

const router = express.Router();

router.get('/candidates', requireCompanyAccess('candidates'), listCandidates);
router.put('/candidates/:id', requireRecruiter, decryptRequest, updateCandidate);
router.patch('/candidates/:id/workflow', requireRecruiter, decryptRequest, updateCandidateWorkflow);
router.delete('/candidates/:id', requireRecruiter, deleteCandidate);

export default router;