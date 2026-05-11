import { translateText, translateObject } from '../services/translationService.js';

/**
 * Handle text or object translation using LibreTranslate.
 */
export async function translate(req, res) {
  try {
    const { text, data, targetLanguage } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ success: false, message: 'Target language is required' });
    }

    if (data) {
      const translatedData = await translateObject(data, targetLanguage);
      return res.json({ success: true, data: translatedData });
    }

    if (text) {
      const translatedText = await translateText(text, targetLanguage);
      return res.json({ success: true, translatedText });
    }

    res.status(400).json({ success: false, message: 'Text or data is required' });
  } catch (error) {
    console.error('Translation Controller Error:', error);
    res.status(500).json({ success: false, message: 'Translation failed' });
  }
}
