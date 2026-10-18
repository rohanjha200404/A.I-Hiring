import express from 'express';
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from '../controllers/employee.controller.js';
import { decryptRequest } from '../middlewares/encryption.middleware.js';
import { requireCompanyAccess } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireCompanyAccess('accounts'), listEmployees);
router.post('/', requireCompanyAccess('accounts'), decryptRequest, createEmployee);
router.put('/:id', requireCompanyAccess('accounts'), decryptRequest, updateEmployee);
router.delete('/:id', requireCompanyAccess('accounts'), deleteEmployee);

export default router;