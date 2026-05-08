import { Router } from 'express';
import { bookLab, listLabs } from '../controllers/misc.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/', protect, listLabs);
router.post('/bookings', protect, authorize('patient'), bookLab);
export default router;
