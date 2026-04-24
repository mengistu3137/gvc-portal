import express from 'express';
import { 
  getOfferings, 
  getOfferingById, 
  createOffering, 
  updateOffering, 
  deleteOffering 
} from './module_offering.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();
const auth = (perm) => [authenticate, authorize(perm)];

router.get('/', auth('view_offering'), getOfferings);
router.get('/:id', auth('view_offering'), getOfferingById);
router.post('/', auth('manage_offering'), createOffering);
router.put('/:id', auth('manage_offering'), updateOffering);
router.delete('/:id', auth('manage_offering'), deleteOffering);


export default router;