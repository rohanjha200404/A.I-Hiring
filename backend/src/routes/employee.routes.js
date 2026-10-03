import express from 'express';
import { createEmployee, deleteEmployee, listEmployees } from '../controllers/employee.controller.js';
import { decryptRequest } from '../middlewares/encryption.middleware.js';
import { requireRecruiter } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireRecruiter, listEmployees);
router.post('/', requireRecruiter, decryptRequest, createEmployee);
router.delete('/:id', requireRecruiter, deleteEmployee);

export default router;