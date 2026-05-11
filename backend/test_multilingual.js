import 'dotenv/config';
import mongoose from 'mongoose';
import { generateMedicineExplanation } from './ai/medicineExplanation.service.js';
import Prescription from './models/Prescription.js';

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const p = await Prescription.findOne();
  if (!p) {
    console.log('No prescription found');
    process.exit(0);
  }

  const languages = ['en', 'hi', 'te'];

  for (const lang of languages) {
    console.log(`\n--- Testing Language: ${lang} ---`);
    try {
      const result = await generateMedicineExplanation({ prescription: p, lang });
      console.log(`Response in ${lang}:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`Error for ${lang}:`, error.message);
    }
  }

  process.exit(0);
}

test();
