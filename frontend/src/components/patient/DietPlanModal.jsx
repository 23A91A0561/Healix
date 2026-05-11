import { useEffect, useMemo, useRef, useState } from 'react';
import { FaCheckCircle, FaGlassWhiskey, FaLeaf, FaTimes, FaTimesCircle, FaWalking } from 'react-icons/fa';
import { fetchDietPlan } from '../../services/aiExplanation.js';
import { translateData } from '../../services/api.js';
import LanguageSelector from './LanguageSelector.jsx';
import VoicePlayer from './VoicePlayer.jsx';

function normalizeDietPlan(data) {
  const plan = data?.plan || data?.dietPlan || data;

  return {
    eat: plan?.foodsToEat || plan?.eat || [],
    avoid: plan?.foodsToAvoid || plan?.avoid || [],
    hydration: Array.isArray(plan?.hydration) ? plan.hydration.join(' ') : plan?.hydration || plan?.hydrationAdvice || '',
    habits: plan?.healthyHabits || plan?.habits || []
  };
}

function hasDietPlan(plan) {
  return Boolean(plan && (plan.eat?.length || plan.avoid?.length || plan.hydration || plan.habits?.length));
}

function isCanceledRequest(error) {
  return error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
}

export default function DietPlanModal({ prescription, onClose }) {
  const [language, setLanguage] = useState('en');
  const [plan, setPlan] = useState(null);
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
        const data = await fetchDietPlan(prescription, language, controller.signal);
        const normalized = normalizeDietPlan(data);
        setPlan(hasDietPlan(normalized) ? normalized : null);
      } catch (apiError) {
        if (isCanceledRequest(apiError)) return;
        setError(apiError.response?.data?.message || 'Unable to load diet plan.');
        setPlan(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => controller.abort();
  }, [language, prescription]);

  const speechText = useMemo(() => {
    if (!plan) return '';
    const labels = {
      en: { eat: 'Foods to eat', avoid: 'Foods to avoid', hydration: 'Hydration', habits: 'Healthy habits' },
      hi: { eat: 'खाने योग्य भोजन', avoid: 'बचने योग्य भोजन', hydration: 'जलयोजन', habits: 'स्वस्थ आदतें' },
      te: { eat: 'తినవలసిన ఆహారాలు', avoid: 'నివారించవలసిన ఆహారాలు', hydration: 'హైడ్రేషన్', habits: 'ఆరోగ్యకరమైన అలవాట్లు' }
    };
    const l = labels[language] || labels.en;

    return [
      `${l.eat}: ${(plan.eat || []).join(', ')}`,
      `${l.avoid}: ${(plan.avoid || []).join(', ')}`,
      `${l.hydration}: ${plan.hydration || ''}`,
      `${l.habits}: ${(plan.habits || []).join(', ')}`
    ].join('. ');
  }, [plan, language]);

  if (!prescription) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl animate-[modalIn_0.22s_ease-out]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">AI Diet Plan</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{prescription.diagnosis || 'Personal food guidance'}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSelector value={language} onChange={setLanguage} id="diet-language" />
            <VoicePlayer text={speechText} language={language} label="Listen Diet Plan" />
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

          {loading || !plan ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <FaCheckCircle className="text-emerald-600" />
                  Foods to Eat
                </h3>
                <div className="mt-4 space-y-3">
                  {(plan.eat || []).map((item) => (
                    <p key={item} className="flex gap-2 rounded-xl bg-white/80 p-3 text-sm font-semibold text-slate-700">
                      <FaLeaf className="mt-0.5 shrink-0 text-emerald-500" />
                      {item}
                    </p>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-rose-50/70 p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <FaTimesCircle className="text-rose-500" />
                  Foods to Avoid
                </h3>
                <div className="mt-4 space-y-3">
                  {(plan.avoid || []).map((item) => (
                    <p key={item} className="flex gap-2 rounded-xl bg-white/80 p-3 text-sm font-semibold text-slate-700">
                      <FaTimesCircle className="mt-0.5 shrink-0 text-rose-400" />
                      {item}
                    </p>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <FaGlassWhiskey className="text-sky-600" />
                  Hydration Advice
                </h3>
                <p className="mt-4 rounded-xl bg-white/80 p-4 text-sm font-semibold leading-6 text-slate-700">{plan.hydration}</p>
              </section>

              <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <FaWalking className="text-blue-600" />
                  Healthy Habits
                </h3>
                <div className="mt-4 space-y-3">
                  {(plan.habits || []).map((item) => (
                    <p key={item} className="rounded-xl bg-white/80 p-3 text-sm font-semibold text-slate-700">{item}</p>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
