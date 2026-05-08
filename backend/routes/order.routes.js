import { Router } from 'express';
import { createOrder, listOrders } from '../controllers/misc.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/', protect, authorize('patient'), listOrders);
router.post('/', protect, authorize('patient'), createOrder);
export default router;
