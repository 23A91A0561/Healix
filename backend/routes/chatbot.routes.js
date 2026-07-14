import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { chatWithCureAI } from '../controllers/chatbot.controller.js';

const router = Router();

router.post('/message', protect, chatWithCureAI);

export default router;
