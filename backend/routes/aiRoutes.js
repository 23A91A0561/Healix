import { Router } from 'express';
import { analyzeAi, listSymptoms } from '../controllers/misc.controller.js';
import {
  analyzePrescription,
  createPrescriptionDietPlan,
  createStaticPrescriptionDietPlan,
  explainPrescriptionMedicines,
  explainStaticPrescriptionMedicines
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/symptoms', listSymptoms);
router.post('/analyze', protect, analyzeAi);
router.post('/explanation', protect, explainStaticPrescriptionMedicines);
router.get('/explanation/:prescriptionId', protect, explainPrescriptionMedicines);
router.post('/diet', protect, createStaticPrescriptionDietPlan);
router.get('/diet/:prescriptionId', protect, createPrescriptionDietPlan);
router.get('/prescription-analysis/:prescriptionId', protect, analyzePrescription);
export default router;
