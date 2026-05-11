import 'dotenv/config';
import { generateMedicineExplanation } from './ai/medicineExplanation.service.js';
import { translateText, translateObject } from './services/translationService.js';
import { generateSpeech } from './services/ttsService.js';
import connectDB from './config/db.js';
import Prescription from './models/Prescription.js';

async function testArchitecture() {
  console.log('--- STARTING ARCHITECTURE TEST ---');

  try {
    await connectDB();
    
    // 1. Fetch a real prescription
    const prescription = await Prescription.findOne();
    if (!prescription) {
      console.error('No prescription found in DB to test with.');
      return;
    }
    console.log('Testing with Prescription ID:', prescription._id);
    console.log('Diagnosis:', prescription.diagnosis);

    // 2. Test Groq Call (English ONLY)
    console.log('\n--- STEP 1: Groq English Response ---');
    const englishItems = await generateMedicineExplanation({ prescription });
    console.log('Groq Response (Items):', JSON.stringify(englishItems, null, 2));
    
    const isEnglish = englishItems.every(item => 
      !/[^\x00-\x7F]/.test(item.usage) // Simple regex for non-ASCII (rough check for non-English)
    );
    console.log('Is response English-only?', isEnglish);

    // 3. Test Translation (Google Cloud)
    console.log('\n--- STEP 2: Translation (Hindi) ---');
    if (!process.env.GOOGLE_PROJECT_ID) {
      console.warn('Skipping Translation test: GOOGLE_PROJECT_ID not set.');
    } else {
      try {
        const hindiItems = await translateObject(englishItems, 'hi');
        console.log('Hindi Translation:', JSON.stringify(hindiItems, null, 2));
      } catch (err) {
        console.error('Hindi Translation Failed:', err.message);
      }

      console.log('\n--- STEP 3: Translation (Telugu) ---');
      try {
        const teluguItems = await translateObject(englishItems, 'te');
        console.log('Telugu Translation:', JSON.stringify(teluguItems, null, 2));
      } catch (err) {
        console.error('Telugu Translation Failed:', err.message);
      }
    }

    // 4. Test TTS (Google Cloud)
    console.log('\n--- STEP 4: Text-to-Speech (Hindi) ---');
    if (!process.env.GOOGLE_PROJECT_ID) {
      console.warn('Skipping TTS test: GOOGLE_PROJECT_ID not set.');
    } else {
      try {
        const textToSpeak = englishItems[0].usage;
        console.log('Synthesizing text:', textToSpeak);
        const audioBuffer = await generateSpeech(textToSpeak, 'hi-IN');
        console.log('Audio Buffer received, size:', audioBuffer.length, 'bytes');
        console.log('TTS Test Successful!');
      } catch (err) {
        console.error('TTS Failed:', err.message);
      }
    }

    console.log('\n--- ARCHITECTURE TEST COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('Test Suite Failed:', error);
    process.exit(1);
  }
}

testArchitecture();
