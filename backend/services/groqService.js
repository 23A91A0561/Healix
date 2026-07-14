import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn("⚠️  GROQ_API_KEY is not set — AI features will return mock responses.");
}

const groq = apiKey ? new Groq({ apiKey }) : null;

const PRIMARY_MODEL = "llama-3.1-8b-instant";

async function generateWithModel(prompt, modelName) {
  if (!groq) throw new Error("GROQ_API_KEY is not configured");
  console.log("Sending Groq Request...");
  console.log("Groq Model:", modelName);
  
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model: modelName,
    temperature: 0.2, // low temperature for structured output
  });

  const text = completion.choices[0]?.message?.content || "";
  console.log("Groq Response:", text);
  return text;
}

export const generateAIResponse = async (prompt) => {
  try {
    return await generateWithModel(prompt, PRIMARY_MODEL);
  } catch (error) {
    console.error("Groq Error:", error.message || error);
    
    console.log("Returning Mock Response due to API limits or errors...");
    
    if (prompt.includes("medicine") || prompt.includes("purpose")) {
      return JSON.stringify([
        {
          medicine: "Mock Medicine (API unavailable)",
          purpose: "Used to treat the prescribed condition",
          dosage: "Take 1 tablet twice daily after meals",
          precautions: "This is mock data — please consult your doctor"
        }
      ]);
    } else if (prompt.includes("diet") || prompt.includes("foodsToEat")) {
      return JSON.stringify({
        foodsToEat: ["Fresh fruits", "Green leafy vegetables", "Whole grains"],
        foodsToAvoid: ["Oily food", "Excessive sugar", "Processed snacks"],
        hydration: ["Drink at least 2 litres of water daily"],
        healthyHabits: ["Sleep 7-8 hours", "Light exercise daily", "Avoid stress"]
      });
    } else {
      return JSON.stringify({
        summary: "Mock prescription analysis — Groq API was unavailable.",
        diagnosis: "See your prescription for details",
        medicines: ["Refer to prescription"],
        warnings: [],
        followUp: ["Follow up with your doctor in 7 days"]
      });
    }
  }
};
