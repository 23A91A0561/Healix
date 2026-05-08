import { Router } from 'express';
import { uploadReport } from '../controllers/misc.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
const router = Router();
router.post('/reports', protect, upload.single('file'), uploadReport);
export default router;
