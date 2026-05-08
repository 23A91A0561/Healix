import { Router } from 'express';
import { listNotifications, markNotificationRead } from '../controllers/misc.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/', protect, listNotifications);
router.patch('/:id/read', protect, markNotificationRead);
export default router;
