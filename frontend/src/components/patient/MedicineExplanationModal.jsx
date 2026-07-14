import { useEffect, useMemo, useRef, useState } from 'react';
import { FaPills, FaTimes } from 'react-icons/fa';
import { fetchMedicineExplanation } from '../../services/aiExplanation.js';
import { translateData } from '../../services/api.js';
import LanguageSelector from './LanguageSelector.jsx';
import VoicePlayer from './VoicePlayer.jsx';

function asMedicineList(medicines) {
  if (Array.isArray(medicines)) return medicines;
  if (typeof medicines === 'string') {
    return medicines
      .split(/\n|,/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }
  return [];
}

function normalizeExplanation(data, prescription) {
  const payload =
    data?.items ||
    data?.data?.items ||
    data?.data?.explanations ||
    data?.data ||
    data?.medicines ||
    data?.explanations ||
    data?.explanation ||
    (Array.isArray(data) ? data : undefined);

  if (Array.isArray(payload)) return payload;

  if (typeof payload === 'string') {
    return asMedicineList(prescription.medicines).map((medicine) => ({
      medicine: medicine.name || 'Medicine',
      usage: payload,
      precautions: '',
      sideEffects: '',
      safety: ''
    }));
  }

  if (payload && typeof payload === 'object') return [payload];
  return [];
}

function isCanceledRequest(error) {
  return error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
}

export default function MedicineExplanationModal({ prescription, onClose }) {
  const [language, setLanguage] = useState('en');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!prescription?._id && !prescription?.id) return;

    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        // Direct fetch from Groq in selected language
        const data = await fetchMedicineExplanation(prescription, language, controller.signal);
        const normalized = normalizeExplanation(data, prescription);
        setItems(normalized);
      } catch (apiError) {
        if (isCanceledRequest(apiError)) return;
        setError(apiError.response?.data?.message || 'Service error.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => controller.abort();
  }, [language, prescription]);

  const speechText = useMemo(() => {
    const labels = {
      en: { purpose: 'Purpose', dosage: 'Dosage', precautions: 'Precautions' },
      hi: { purpose: 'उद्देश्य', dosage: 'खुराक', precautions: 'सावधानियां' },
      te: { purpose: 'ఉద్దేశ్యం', dosage: 'మోతాదు', precautions: 'జాగ్రత్తలు' }
    };
    const l = labels[language] || labels.en;

    return items.map((item) => 
      `${item.medicine || item.name || ''}. ${l.purpose}: ${item.purpose || ''}. ${l.dosage}: ${item.dosage || ''}. ${l.precautions}: ${item.precautions || ''}.`
    ).join(' ');
  }, [items, language]);

  if (!prescription) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl animate-[modalIn_0.22s_ease-out]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-600">AI Medicine Details</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{prescription.diagnosis || 'Prescription explanation'}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSelector value={language} onChange={setLanguage} id="medicine-language" />
            <VoicePlayer text={speechText} language={language} label="Listen" />
            <button type="button" onClick={onClose} className="rounded-full bg-white p-3 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900">
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-104px)] overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item, index) => (
                <article key={`${item.medicine}-${index}`} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-lg shadow-sky-50">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FaPills className="text-sky-600" />
                    {String(item?.medicine || item?.name || `Medicine ${index + 1}`)}
                  </h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p><span className="font-bold text-slate-900">Purpose:</span> {String(item?.purpose || 'As prescribed by your doctor.')}</p>
                    <p><span className="font-bold text-slate-900">Dosage:</span> {String(item?.dosage || 'Follow doctor instructions.')}</p>
                    <p><span className="font-bold text-slate-900">Precautions:</span> {String(item?.precautions || 'Consult your doctor for specific guidance.')}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
