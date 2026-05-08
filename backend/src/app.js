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
import aiRoutes from '../routes/ai.routes.js';
import adminRoutes from '../routes/admin.routes.js';
import { notFound, errorHandler } from '../middleware/error.middleware.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
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
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
