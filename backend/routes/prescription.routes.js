import { Router } from 'express';
import { createPrescription, listPrescriptions, prescriptionPdf } from '../controllers/prescription.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';
const router = Router();
router.use(protect);
router.get('/', listPrescriptions);
router.post('/', authorize('doctor'), createPrescription);
router.get('/:id/pdf', prescriptionPdf);
export default router;
