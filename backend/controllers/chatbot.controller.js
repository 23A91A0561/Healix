import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const SYSTEM_PROMPT = `You are Cure AI, an intelligent and empathetic medical assistant built into the Healix healthcare platform.

Your role:
- Help patients understand their symptoms, medications, and general health questions
- Provide clear, compassionate, and evidence-based health information
- Suggest appropriate specialist types when symptoms are described
- Identify potential emergencies and urge immediate medical attention
- Help patients prepare for doctor visits (what to say, what to ask)
- Explain medical terms in simple language

Critical rules:
1. NEVER diagnose definitively — always recommend consulting a real doctor for diagnosis
2. For ANY emergency symptoms (chest pain, difficulty breathing, stroke signs, severe bleeding, loss of consciousness), IMMEDIATELY urge calling emergency services (911 / 112)
3. Keep responses concise, warm, and clear — avoid medical jargon unless explained
4. If asked about medications, explain them but always say "as prescribed by your doctor"
5. You can discuss diet, lifestyle, mental health, and preventive care freely
6. You are NOT a replacement for professional medical care — always remind users of this for serious concerns
7. Format responses with bullet points or short paragraphs for readability
8. Remember the conversation context and refer back to it naturally

You have access to the Healix platform where users can: book appointments, view prescriptions, order medicines, and consult doctors via video. Suggest these features when relevant.`;

// In-memory conversation store (per user, last 20 turns)
const conversationStore = new Map();

export async function chatWithCureAI(req, res) {
  try {
    const userId = req.user._id.toString();
    const { message, reset } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or init conversation history
    if (reset || !conversationStore.has(userId)) {
      conversationStore.set(userId, []);
    }
    const history = conversationStore.get(userId);

    // Add user message to history
    history.push({ role: 'user', content: message.trim() });

    // Keep last 20 messages (10 turns) to stay within token limits
    const recentHistory = history.slice(-20);

    let replyText;

    if (!groq) {
      // Fallback if no API key
      replyText = `I'm Cure AI, your health assistant on Healix! It looks like I'm temporarily unavailable (API not configured). Please try again later or consult one of our doctors directly through the platform.`;
    } else {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...recentHistory,
        ],
        temperature: 0.6,
        max_tokens: 600,
      });
      replyText = completion.choices[0]?.message?.content?.trim() || 'Sorry, I could not generate a response. Please try again.';
    }

    // Add assistant reply to history
    history.push({ role: 'assistant', content: replyText });

    // Detect if it's an emergency
    const emergencyKeywords = ['chest pain', 'cannot breathe', 'difficulty breathing', 'stroke', 'unconscious', 'severe bleeding', 'heart attack', 'emergency'];
    const isEmergency = emergencyKeywords.some(kw => message.toLowerCase().includes(kw));

    // Detect suggested actions
    const suggestBooking = /\b(book|appointment|consult|doctor|specialist)\b/i.test(replyText);
    const suggestPrescription = /\b(prescription|medicine|medication)\b/i.test(replyText);

    return res.json({
      reply: replyText,
      isEmergency,
      suggestions: {
        booking: suggestBooking,
        prescription: suggestPrescription,
      },
      turnCount: Math.floor(history.length / 2),
    });
  } catch (error) {
    console.error('Cure AI error:', error.message);
    return res.status(500).json({
      reply: 'I encountered an issue processing your message. Please try again in a moment.',
      isEmergency: false,
      suggestions: {},
    });
  }
}
