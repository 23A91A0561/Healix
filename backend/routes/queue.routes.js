import { Router } from 'express';
import { getQueue } from '../controllers/misc.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/:doctorId', protect, getQueue);
export default router;
