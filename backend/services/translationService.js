import axios from 'axios';

const LIBRE_TRANSLATE_URL = 'https://libretranslate.de/translate';

/**
 * Translates text from English to a target language using LibreTranslate.
 * @param {string} text - The text to translate.
 * @param {string} target - The target language code (e.g., 'hi', 'te').
 * @returns {Promise<string>} - The translated text.
 */
export const translateText = async (text, target) => {
  if (!text || !target || target === 'en') return text;

  try {
    const response = await axios.post(LIBRE_TRANSLATE_URL, {
      q: text,
      source: 'en',
      target,
      format: 'text',
    });

    return response.data.translatedText || text;
  } catch (error) {
    console.error('Translation Error:', error.message);
    return text; // Fallback to original text
  }
};

/**
 * Translates an object's values while keeping keys intact.
 * @param {Object} data - The object containing text values.
 * @param {string} targetLanguage - The target language code.
 * @param {string[]} skipKeys - Keys to skip translation for.
 * @returns {Promise<Object>} - The object with translated values.
 */
export async function translateObject(data, targetLanguage, skipKeys = ['medicine', 'name']) {
  if (targetLanguage === 'en' || !data) return data;

  if (Array.isArray(data)) {
    return await Promise.all(data.map(item => translateObject(item, targetLanguage, skipKeys)));
  }

  if (typeof data !== 'object') return data;

  const translatedData = {};
  const entries = Object.entries(data);

  for (const [key, value] of entries) {
    if (skipKeys.includes(key)) {
      translatedData[key] = value;
      continue;
    }

    if (typeof value === 'string' && value.trim()) {
      translatedData[key] = await translateText(value, targetLanguage);
    } else if (typeof value === 'object' && value !== null) {
      translatedData[key] = await translateObject(value, targetLanguage, skipKeys);
    } else {
      translatedData[key] = value;
    }
  }

  return translatedData;
}
