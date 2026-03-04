import express from 'express';
import { addDepartment, addBatch } from './academic.controller.js';
import { authorize,authenticate } from '../../middlewares/authGuard.js'

const router = express.Router();

// Using create_dept and manage_batch
router.post('/departments', authenticate, authorize('create_dept'), addDepartment);
router.post('/batches', authenticate, authorize('manage_batch'), addBatch);

export default router;