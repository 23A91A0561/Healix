import Prescription from '../models/Prescription.js';
import { generateDietPlan, generateMedicineExplanation, generatePrescriptionAnalysis } from '../ai/medicineExplanation.service.js';
import { generateSpeech } from '../services/ttsService.js';

const supportedLanguages = new Set(['en', 'hi', 'te']);

function canAccessPrescription(user, prescription) {
  if (user.role === 'admin') return true;
  if (user.role === 'patient') return prescription.patient?._id?.equals(user._id) || prescription.patient?.equals?.(user._id);
  if (user.role === 'doctor') return prescription.doctor?._id?.equals(user._id) || prescription.doctor?.equals?.(user._id);
  return false;
}

function handleAiError(error, res) {
  console.error('AI API Error:', error);

  const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
  const message = statusCode === 500 ? 'AI generation failed' : error.message;

  return res.status(statusCode).json({
    success: false,
    message
  });
}

export async function explainPrescriptionMedicines(req, res) {
  try {
    const lang = supportedLanguages.has(req.query.lang) ? req.query.lang : 'en';
    const prescription = await Prescription.findById(req.params.prescriptionId).populate('doctor patient', 'name email age');

    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (!canAccessPrescription(req.user, prescription)) return res.status(403).json({ message: 'Forbidden' });

    const items = await generateMedicineExplanation({ prescription, lang });
    res.json(items);
  } catch (error) {
    return handleAiError(error, res);
  }
}

export async function explainStaticPrescriptionMedicines(req, res) {
  try {
    const lang = supportedLanguages.has(req.query.lang) ? req.query.lang : 'en';
    const prescription = req.body?.prescription;

    if (!prescription) return res.status(400).json({ success: false, message: 'Prescription data is required' });

    const items = await generateMedicineExplanation({ prescription, lang });
    res.json(items);
  } catch (error) {
    return handleAiError(error, res);
  }
}

export async function createPrescriptionDietPlan(req, res) {
  try {
    const lang = supportedLanguages.has(req.query.lang) ? req.query.lang : 'en';
    const prescription = await Prescription.findById(req.params.prescriptionId).populate('doctor patient', 'name email age');

    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (!canAccessPrescription(req.user, prescription)) return res.status(403).json({ message: 'Forbidden' });

    const plan = await generateDietPlan({ prescription, lang });
    res.json(plan);
  } catch (error) {
    return handleAiError(error, res);
  }
}

export async function createStaticPrescriptionDietPlan(req, res) {
  try {
    const lang = supportedLanguages.has(req.query.lang) ? req.query.lang : 'en';
    const prescription = req.body?.prescription;

    if (!prescription) return res.status(400).json({ success: false, message: 'Prescription data is required' });

    const plan = await generateDietPlan({ prescription, lang });
    res.json(plan);
  } catch (error) {
    return handleAiError(error, res);
  }
}

export async function analyzePrescription(req, res) {
  try {
    const lang = supportedLanguages.has(req.query.lang) ? req.query.lang : 'en';
    const prescription = await Prescription.findById(req.params.prescriptionId).populate('doctor patient', 'name email age');

    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (!canAccessPrescription(req.user, prescription)) return res.status(403).json({ message: 'Forbidden' });

    const analysis = await generatePrescriptionAnalysis({ prescription, lang });
    res.json(analysis);
  } catch (error) {
    return handleAiError(error, res);
  }
}

export async function getSpeechAudio(req, res) {
  try {
    const { text, lang } = req.query;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    const audioBuffer = await generateSpeech(text, lang || 'en-US');

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Speech Controller Error:', error);
    res.status(500).json({ success: false, message: 'Speech generation failed' });
  }
}
