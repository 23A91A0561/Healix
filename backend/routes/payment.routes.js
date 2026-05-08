import { Router } from 'express';
import { createPaymentIntent, verifyPayment } from '../controllers/misc.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = Router();
router.post('/intent', protect, createPaymentIntent);
router.post('/verify', protect, verifyPayment);
export default router;
