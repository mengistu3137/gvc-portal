import express from 'express';
import { 
  createAnnouncement, getAnnouncements, updateAnnouncement, 
  deleteAnnouncement, getLatestAnnouncement 
} from './announcements.controller.js';
import { authenticate, authorize } from '../../middlewares/authGuard.js';

const router = express.Router();
const auth = (perm) => [authenticate, authorize(perm)];

// PUBLIC: Used by the login page hero section
router.get('/latest', getLatestAnnouncement);

// ADMIN: Management routes
router.route('/')
  .get(auth('view_announcement'), getAnnouncements)
  .post(auth('manage_announcement'), createAnnouncement);

router.route('/:id')
  .put(auth('manage_announcement'), updateAnnouncement)
  .delete(auth('manage_announcement'), deleteAnnouncement);

export default router;