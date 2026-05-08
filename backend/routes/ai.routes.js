import { Router } from 'express';
import { analyzeAi, listSymptoms } from '../controllers/misc.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/symptoms', listSymptoms);
router.post('/analyze', protect, analyzeAi);
export default router;
