import { Router } from 'express';
import { translate } from '../controllers/translationController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/translate', protect, translate);

export default router;
