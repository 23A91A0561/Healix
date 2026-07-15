import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

import authRoutes from '../routes/auth.routes.js';
import doctorRoutes from '../routes/doctor.routes.js';
import appointmentRoutes from '../routes/appointment.routes.js';
import prescriptionRoutes from '../routes/prescription.routes.js';
import queueRoutes from '../routes/queue.routes.js';
import uploadRoutes from '../routes/upload.routes.js';
import paymentRoutes from '../routes/payment.routes.js';
import notificationRoutes from '../routes/notification.routes.js';
import labRoutes from '../routes/lab.routes.js';
import orderRoutes from '../routes/order.routes.js';
import reviewRoutes from '../routes/review.routes.js';
import aiRoutes from '../routes/aiRoutes.js';
import translationRoutes from '../routes/translationRoutes.js';
import adminRoutes from '../routes/admin.routes.js';
import chatbotRoutes from '../routes/chatbot.routes.js';
import { notFound, errorHandler } from '../middleware/error.middleware.js';

const app = express();
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // In development, allow any origin (covers LAN IPs like 10.x.x.x, 192.168.x.x)
  if (process.env.NODE_ENV !== 'production') return true;
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(url.hostname)
      && ['5173', '5174', '5175'].includes(url.port);
  } catch {
    return false;
  }
}

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize());
app.use(xss());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.use('/uploads', express.static('uploads'));

app.get('/', (_req, res) => res.json({ status: 'ok', service: 'Smart Digital Healthcare Platform' }));
app.get('/api/test-groq', async (_req, res) => {
  try {
    const { generateAIResponse } = await import('../services/groqService.js');
    const text = await generateAIResponse(
      "Say Hello from Groq AI"
    );

    res.json({
      success: true,
      text,
    });
  } catch (error) {
    console.error('Groq test route error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
