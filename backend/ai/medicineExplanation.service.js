import { generateAIResponse } from '../services/groqService.js';
import { translateObject } from '../services/translationService.js';

// Groq should only return English responses.

function normalizeMedicines(medicines = []) {
  if (Array.isArray(medicines)) {
    return medicines
      .map((medicine) => ({
        name: medicine.name || medicine.medicine || String(medicine).trim(),
        dosage: medicine.dosage || '',
        frequency: medicine.frequency || '',
        timing: medicine.timing || '',
        duration: medicine.duration || '',
        notes: medicine.notes || ''
      }))
      .filter((medicine) => medicine.name);
  }

  if (typeof medicines === 'string') {
    return medicines
      .split(/\n|,/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, dosage: '', frequency: '', duration: '', notes: '' }));
  }

  return [];
}

function cleanJsonContent(content = '') {
  return String(content)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractJsonArray(content) {
  const trimmed = cleanJsonContent(content);

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      console.log('Parsed Gemini JSON:', parsed);
      return parsed;
    }
    if (Array.isArray(parsed.items)) {
      console.log('Parsed Gemini JSON:', parsed.items);
      return parsed.items;
    }
    if (Array.isArray(parsed.explanations)) {
      console.log('Parsed Gemini JSON:', parsed.explanations);
      return parsed.explanations;
    }
  } catch {
    // Fall through to extracting the first JSON array from model text.
  }

  const match = trimmed.match(/\[[\s\S]*\]/);
  if (!match) {
    const error = new Error('AI response did not contain valid JSON');
    error.statusCode = 502;
    throw error;
  }

  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) {
      const error = new Error('AI response JSON was not an array');
      error.statusCode = 502;
      throw error;
    }
    console.log('Parsed Gemini JSON:', parsed);
    return parsed;
  } catch {
    const error = new Error('AI response did not contain valid JSON');
    error.statusCode = 502;
    throw error;
  }
}

function extractJsonObject(content) {
  const trimmed = cleanJsonContent(content);

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      console.log('Parsed Gemini JSON:', parsed);
      return parsed;
    }
  } catch {
    // Fall through to extracting the first JSON object from model text.
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    const error = new Error('AI response did not contain valid JSON');
    error.statusCode = 502;
    throw error;
  }

  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const error = new Error('AI response JSON was not an object');
      error.statusCode = 502;
      throw error;
    }
    console.log('Parsed Gemini JSON:', parsed);
    return parsed;
  } catch {
    const error = new Error('AI response did not contain valid JSON');
    error.statusCode = 502;
    throw error;
  }
}

function normalizeAiItems(items) {
  if (!Array.isArray(items)) return [];
  
  const toString = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (Array.isArray(val)) return val.join(', ').trim();
    if (typeof val === 'object') return JSON.stringify(val).trim();
    return String(val).trim();
  };

  return items.map((item) => ({
    medicine: toString(item?.medicine || item?.name),
    purpose: toString(item?.purpose || item?.usage || item?.description),
    dosage: toString(item?.dosage || item?.dosageInstructions),
    precautions: toString(item?.precautions || item?.keyPrecautions)
  })).filter((item) => item.medicine);
}

function normalizeDietPlan(plan) {
  if (!plan || typeof plan !== 'object') return { foodsToEat: [], foodsToAvoid: [], hydration: [], healthyHabits: [] };

  const toArray = (val) => {
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === 'string') return [val.trim()];
    if (val && typeof val === 'object') return [JSON.stringify(val)];
    return [];
  };

  const normalized = {
    foodsToEat: toArray(plan.foodsToEat),
    foodsToAvoid: toArray(plan.foodsToAvoid),
    hydration: toArray(plan.hydration),
    healthyHabits: toArray(plan.healthyHabits)
  };

  if (!normalized.foodsToEat.length && !normalized.foodsToAvoid.length) {
    const error = new Error('AI response did not include a complete diet plan');
    error.statusCode = 502;
    throw error;
  }

  return normalized;
}

function normalizePrescriptionAnalysis(analysis) {
  return {
    summary: String(analysis.summary || '').trim(),
    diagnosis: String(analysis.diagnosis || '').trim(),
    medicines: Array.isArray(analysis.medicines) ? analysis.medicines.map(String).filter(Boolean) : [],
    warnings: Array.isArray(analysis.warnings) ? analysis.warnings.map(String).filter(Boolean) : [],
    followUp: Array.isArray(analysis.followUp) ? analysis.followUp.map(String).filter(Boolean) : []
  };
}

function prescriptionContext(prescription) {
  return {
    diagnosis: prescription.diagnosis || prescription.disease || 'Not provided',
    mainComplaint: prescription.mainComplaint || 'Not provided',
    complaintDescription: prescription.complaintDescription || 'Not provided',
    medicines: normalizeMedicines(prescription.medicines),
    dosage: prescription.dosage || 'Not provided',
    suggestions: prescription.suggestions || prescription.notes || 'Not provided',
    notes: prescription.notes || prescription.suggestions || 'Not provided',
    uploadedDocument: prescription.uploadedFile || prescription.pdfUrl || prescription.documentUrl || prescription.imageUrl || 'Not provided',
    extractedText: prescription.extractedText || prescription.analysisText || prescription.ocrText || 'Not provided'
  };
}

const SYSTEM_PROMPT = `You are a professional medical information assistant for the Healix healthcare platform. You provide clear, accurate, and concise medical guidance based on doctor-prescribed data.

STRICT RULES:
1. Return ONLY valid JSON — no markdown fences, no preamble, no extra text.
2. Be concise and professional. Every sentence should be useful.
3. Use simple language a patient can understand.
4. Do not add alarming warnings or unnecessary disclaimers.
5. Do not invent information — base everything on the prescription data provided.`;

const languagePrompts = {
  en: "in English",
  hi: "completely in Hindi language",
  te: "completely in Telugu language"
};

export async function generateMedicineExplanation({ prescription, lang = 'en' }) {
  const context = prescriptionContext(prescription);
  const languageInstruction = languagePrompts[lang] || languagePrompts.en;

  if (!context.medicines.length) {
    const error = new Error('No medicines found in this prescription');
    error.statusCode = 400;
    throw error;
  }

  const prompt = `${SYSTEM_PROMPT}

For each medicine in this prescription, provide:
- medicine: Name of the medicine
- purpose: What this medicine is used for (1 sentence)
- dosage: How and when to take it (clear instructions)
- precautions: One key precaution to be aware of

Return ${languageInstruction}. Keys must stay in English, values in the requested language (${lang}).

Prescription data: ${JSON.stringify(context)}

Return format: [{"medicine": "", "purpose": "", "dosage": "", "precautions": ""}]`;

  console.log('Groq prompt sent:', prompt);
  const content = await generateAIResponse(prompt);
  const items = normalizeAiItems(extractJsonArray(content));

  if (!items.length) {
    const error = new Error('AI response did not include medicine explanations');
    error.statusCode = 502;
    throw error;
  }

  return items;
}

export async function generateDietPlan({ prescription, lang = 'en' }) {
  const context = prescriptionContext(prescription);
  const languageInstruction = languagePrompts[lang] || languagePrompts.en;

  const prompt = `${SYSTEM_PROMPT}

Based on the diagnosis and medicines in this prescription, create a practical diet plan with:
- foodsToEat: 5-6 specific foods that help recovery (e.g. "Banana — rich in potassium, helps restore energy")
- foodsToAvoid: 4-5 specific foods that could worsen the condition
- hydration: A single clear hydration recommendation
- healthyHabits: 3-4 actionable daily habits for recovery

Be specific — name actual foods, not generic categories. Return ${languageInstruction}. Keys must stay in English, values in the requested language (${lang}).

Prescription data: ${JSON.stringify(context)}

Return format: {"foodsToEat": [], "foodsToAvoid": [], "hydration": [], "healthyHabits": []}`;

  console.log('Groq prompt sent:', prompt);
  const content = await generateAIResponse(prompt);
  const plan = normalizeDietPlan(extractJsonObject(content));

  return plan;
}

export async function generatePrescriptionAnalysis({ prescription, lang = 'en' }) {
  const context = prescriptionContext(prescription);
  const languageInstruction = languagePrompts[lang] || languagePrompts.en;

  const prompt = `
You are a careful medical prescription education assistant.
Analyze this prescription for patient understanding ${languageInstruction}.

Use this prescription context JSON:
${JSON.stringify(context)}

Rules:
- Respond only with valid JSON.
- Return exactly one JSON object.
- Summarize the prescription ${languageInstruction} without adding a new diagnosis.
- Mention medicines only if present in the prescription context.
- Keep advice safe and non-alarming.
- Do not tell the patient to change dosage without consulting a doctor.
- IMPORTANT: Return the JSON object with keys in English (summary, diagnosis, medicines, warnings, followUp) but all values MUST be in the requested language (${lang}).

Required JSON format:
{
  "summary": "...",
  "diagnosis": "...",
  "medicines": [],
  "warnings": [],
  "followUp": []
}
`;

  console.log('Groq prompt sent:', prompt);
  const content = await generateAIResponse(prompt);
  const analysis = normalizePrescriptionAnalysis(extractJsonObject(content));

  if (!analysis.summary) {
    const error = new Error('AI response did not include prescription analysis');
    error.statusCode = 502;
    throw error;
  }

  return analysis;
}
