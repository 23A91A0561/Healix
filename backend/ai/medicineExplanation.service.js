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
    usage: toString(item?.usage),
    precautions: toString(item?.precautions),
    sideEffects: toString(item?.sideEffects || item?.side_effects),
    safeUse: toString(item?.safeUse || item?.safe_use || item?.safety || item?.howToUse)
  })).filter((item) => item.medicine && item.usage);
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

const SYSTEM_PROMPT = `Act as a medical data analyst for the Healix Medical Center platform. Your task is to process doctor-prescribed JSON data and return strictly formatted, medically accurate supplementary information.

STRICT RULES:
1. ALWAYS return ONLY a valid JSON object or array. No markdown blocks (no \`\`\`json), no preamble, and no closing remarks.
2. If the request is for "Give Details", output an ARRAY of objects:
   [{"medicine": "", "usage": "", "precautions": "", "sideEffects": "", "safeUse": ""}]
3. If the request is for "Diet Plan", output an OBJECT:
   {"foodsToEat": [], "foodsToAvoid": [], "hydration": [], "healthyHabits": []}
JSON PARSING FAILSAFE:
If you are unable to generate a specific field, provide a general medical best practice for that field rather than leaving it empty.`;

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

Analyze this prescription and generate medicine details ${languageInstruction}. Provide medicine usage, precautions, side effects, and safe usage instructions for every medicine listed.

IMPORTANT: Return the JSON object with keys in English but all values MUST be in the requested language (${lang}). Values must be simple strings, not nested objects or arrays.

Prescription: ${JSON.stringify(context)}
Return format: Array of JSON objects.`;

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

Analyze the disease and suggestions in this prescription and generate a diet plan ${languageInstruction}. Include foods to eat, foods to avoid, hydration requirements, and healthy habits.

IMPORTANT: Return the JSON object with keys in English (foodsToEat, foodsToAvoid, hydration, healthyHabits) but all values MUST be in the requested language (${lang}).

Prescription: ${JSON.stringify(context)}
Return format: Single JSON object.`;

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
