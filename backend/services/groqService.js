import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error("Missing GROQ_API_KEY");
}

const groq = new Groq({ apiKey });

const PRIMARY_MODEL = "llama-3.1-8b-instant";

async function generateWithModel(prompt, modelName) {
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
    
    if (prompt.includes("Array of JSON objects") || prompt.includes("medicine details")) {
      return JSON.stringify([
        {
          medicine: "Mock Medicine (Quota Exceeded)",
          usage: "Take 1 pill twice a day",
          precautions: "Take after meals",
          sideEffects: "None known in mock data",
          safeUse: "This is mock data. Please consult your real doctor."
        }
      ]);
    } else if (prompt.includes("diet plan") || prompt.includes("Single JSON object")) {
      return JSON.stringify({
        foodsToEat: ["Fruits", "Green leafy vegetables", "Whole grains"],
        foodsToAvoid: ["Oily food", "Excessive sugar", "Processed snacks"],
        hydration: ["Drink at least 2 liters of water daily"],
        healthyHabits: ["Sleep for 8 hours", "Avoid stress"]
      });
    } else {
      return JSON.stringify({
        summary: "This is a mock prescription analysis because the Groq API quota was exceeded.",
        diagnosis: "Mock Diagnosis",
        medicines: ["Mock Medicine"],
        warnings: ["Mock Warning: Please verify with a real doctor."],
        followUp: ["Follow up in 7 days"]
      });
    }
  }
};
