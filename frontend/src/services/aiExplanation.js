import api from './api.js';

const supportedLanguages = new Set(['en', 'hi', 'te']);

export function normalizeAiLanguage(language) {
  return supportedLanguages.has(language) ? language : 'en';
}

export async function fetchMedicineExplanation(prescriptionId, language = 'en', signal) {
  const lang = normalizeAiLanguage(language);
  if (prescriptionId && typeof prescriptionId === 'object') {
    const { data } = await api.post('/ai/explanation', { prescription: prescriptionId }, {
      params: { lang },
      signal,
      timeout: 30000
    });
    return data;
  }

  const { data } = await api.get(`/ai/explanation/${prescriptionId}`, {
    params: { lang },
    signal,
    timeout: 24000
  });
  return data;
}

export async function fetchDietPlan(prescriptionId, language = 'en', signal) {
  const lang = normalizeAiLanguage(language);
  if (prescriptionId && typeof prescriptionId === 'object') {
    const { data } = await api.post('/ai/diet', { prescription: prescriptionId }, {
      params: { lang },
      signal,
      timeout: 30000
    });
    return data;
  }

  const { data } = await api.get(`/ai/diet/${prescriptionId}`, {
    params: { lang },
    signal,
    timeout: 24000
  });
  return data;
}
