import { Router } from 'express';
import { body } from 'express-validator';
import { forgotPassword, login, me, refresh, register, resetPassword, verifyEmail, uploadAvatar } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();
router.post('/register', [body('email').trim().isEmail(), body('password').isLength({ min: 8 }), body('name').trim().notEmpty()], validate, register);
router.post('/login', [body('email').trim().isEmail(), body('password').trim().notEmpty()], validate, login);
router.post('/refresh', refresh);
router.get('/me', protect, me);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.patch('/avatar', protect, upload.single('avatar'), uploadAvatar);
export default router;
