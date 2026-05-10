import express from 'express';
import vitalsController from '../controllers/vitals.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Initialize vitals monitoring
router.post(
  '/:consultationId/initialize',
  protect,
  vitalsController.initializeVitals
);

// Store a vital reading
router.post(
  '/:consultationId/reading',
  protect,
  vitalsController.storeVitalReading
);

// Get current vitals
router.get(
  '/:consultationId',
  protect,
  vitalsController.getVitals
);

// Get vitals summary
router.get(
  '/:consultationId/summary',
  protect,
  vitalsController.getVitalsSummary
);

// Get vital readings history
router.get(
  '/:consultationId/history',
  protect,
  vitalsController.getVitalReadingsHistory
);

// Stop vitals monitoring
router.post(
  '/:consultationId/stop',
  protect,
  vitalsController.stopVitalsMonitoring
);

export default router;