import dotenv from 'dotenv';
dotenv.config();

import { generateAIResponse } from './services/groqService.js';
import { generateDietPlan, generateMedicineExplanation } from './ai/medicineExplanation.service.js';

async function test() {
  const dummyPrescription = {
    diagnosis: "Fever",
    mainComplaint: "High fever and headache",
    complaintDescription: "Patient has fever for 3 days with body pains and weakness.",
    medicines: [
      { name: "Dolo 650", dosage: "650mg", frequency: "Twice daily", timing: "After meals", duration: "5 days", notes: "" },
      { name: "ORS Solution", dosage: "1 sachet in water", frequency: "Once daily", timing: "After lunch", duration: "3 days", notes: "" }
    ],
    dosage: "Not provided",
    suggestions: "Drink warm water, take proper rest, avoid oily foods.",
    notes: "Drink warm water, take proper rest, avoid oily foods.",
    uploadedDocument: "/sample-prescription.pdf",
    extractedText: "Not provided"
  };

  try {
    console.log("=== Testing Medicine Explanation ===");
    const explanation = await generateMedicineExplanation({ prescription: dummyPrescription, lang: 'en' });
    console.log("Explanation success:", explanation);
  } catch (err) {
    console.error("Explanation failed:", err);
  }

  try {
    console.log("\n=== Testing Diet Plan ===");
    const diet = await generateDietPlan({ prescription: dummyPrescription, lang: 'en' });
    console.log("Diet success:", diet);
  } catch (err) {
    console.error("Diet failed:", err);
  }
}

test();
