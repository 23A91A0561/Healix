import { Router } from 'express';
import { createReview } from '../controllers/misc.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';
const router = Router();
router.post('/', protect, authorize('patient'), createReview);
export default router;
