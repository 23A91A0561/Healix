import textToSpeech from '@google-cloud/text-to-speech';
import axios from 'axios';

// Initialize the Google Cloud TTS client
// It will look for GOOGLE_APPLICATION_CREDENTIALS in .env
let client;
try {
  if (process.env.GOOGLE_PROJECT_ID) {
    client = new textToSpeech.TextToSpeechClient();
    console.log('Google Cloud TTS Client initialized.');
  }
} catch (error) {
  console.warn('Google Cloud TTS initialization failed, using fallback:', error.message);
}

/**
 * Generates speech audio from text.
 * @param {string} text - The text to synthesize.
 * @param {string} lang - The language code (e.g., 'te-IN', 'hi-IN', 'en-US').
 * @returns {Promise<Buffer>} - Audio buffer (MP3).
 */
export async function generateSpeech(text, lang = 'en-US') {
  if (!text) throw new Error('Text is required for speech generation');

  // Attempt using Google Cloud TTS if available
  if (client) {
    try {
      const request = {
        input: { text },
        voice: { 
          languageCode: lang, 
          // Use a standard voice for Telugu/Hindi if available
          name: lang === 'te-IN' ? 'te-IN-Standard-A' : (lang === 'hi-IN' ? 'hi-IN-Standard-A' : undefined),
          ssmlGender: 'FEMALE' 
        },
        audioConfig: { audioEncoding: 'MP3' },
      };

      const [response] = await client.synthesizeSpeech(request);
      return response.audioContent;
    } catch (error) {
      console.error('Google Cloud TTS Error, falling back:', error.message);
    }
  }

  // Fallback: Use unofficial Google Translate TTS
  // NOTE: This is for development/fallback purposes and has rate limits.
  try {
    const tl = lang.split('-')[0]; // Get 'te' from 'te-IN'
    
    // Google Translate TTS has a limit of ~200 chars. Split text into chunks.
    const chunks = text.match(/.{1,200}(\s|$)|.{1,200}/g) || [text];
    const audioBuffers = [];

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=${tl}&client=tw-ob`;
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      audioBuffers.push(Buffer.from(response.data));
    }

    return Buffer.concat(audioBuffers);
  } catch (fallbackError) {
    console.error('TTS Fallback Error:', fallbackError.message);
    throw new Error('Failed to generate speech audio');
  }
}
