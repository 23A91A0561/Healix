import natural from 'natural';
import AIConversation from '../models/AIConversation.js';
import { symptomDataset } from './symptomDataset.js';

const tokenizer = new natural.WordTokenizer();

export async function analyzeSymptoms({ user, text, conversationId }) {
  const input = text.toLowerCase();
  const tokens = tokenizer.tokenize(input);
  let best = null;

  for (const item of symptomDataset) {
    const terms = [item.symptom, ...item.synonyms];
    for (const term of terms) {
      const score = natural.JaroWinklerDistance(input, term) + (input.includes(term) ? 1 : 0);
      if (!best || score > best.score) best = { ...item, matchedTerm: term, score };
    }
  }

  const duration = input.match(/(\d+\s*(day|days|hour|hours|week|weeks|month|months))/)?.[1];
  const severity = input.match(/\b([1-9]|10)\s*(\/10|out of 10)?\b/)?.[1];
  const confidence = Math.min(0.98, Number(((best?.score || 0) / 2).toFixed(2)));
  const emergency = best?.emergencyFlag || ['chest pain', 'cannot breathe', 'unconscious', 'stroke'].some((w) => input.includes(w));
  const missing = ['duration', 'severity'].filter((key) => !({ duration, severity })[key]);

  const analysis = {
    intent: 'symptom_triage',
    symptom: best?.symptom,
    tokens,
    duration,
    severity,
    confidence,
    emergency,
    recommendedDoctor: best?.recommendedDoctor,
    missing,
    response: emergency
      ? 'This may be a medical emergency. Please seek urgent medical help or call emergency services now.'
      : missing.length
        ? `I noticed ${best?.symptom || 'your symptom'}. ${best?.followUpQuestions?.[0]}`
        : `Based on what you shared, consider consulting a ${best?.recommendedDoctor}. I can help you book an appointment.`
  };

  const conversation = conversationId
    ? await AIConversation.findById(conversationId)
    : await AIConversation.create({ user, messages: [], memory: {} });
  conversation.messages.push({ role: 'user', text });
  conversation.messages.push({ role: 'assistant', text: analysis.response, analysis });
  conversation.memory = { lastSymptom: analysis.symptom, duration, severity };
  await conversation.save();
  return { conversationId: conversation._id, analysis, datasetSize: symptomDataset.length };
}
