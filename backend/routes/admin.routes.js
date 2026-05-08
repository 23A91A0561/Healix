import { Router } from 'express';
import { adminStats, blockUser } from '../controllers/misc.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';
const router = Router();
router.use(protect, authorize('admin'));
router.get('/stats', adminStats);
router.patch('/users/:id/block', blockUser);
export default router;
