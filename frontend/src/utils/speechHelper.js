/**
 * Speaks text using the browser's SpeechSynthesis API.
 * @param {string} text - The text to speak.
 * @param {string} lang - The language code (e.g., 'en-US', 'hi-IN', 'te-IN').
 */
export const speakText = (text, lang = "en-US") => {
  // Cancel any ongoing speech to prevent overlapping
  window.speechSynthesis.cancel();

  if (!text || !text.trim()) return;

  const attemptSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    console.log(`Searching voice for ${lang}. Total voices: ${voices.length}`);

    // Improved voice selection logic
    let selectedVoice = voices.find(v => v.lang === lang) || 
                       voices.find(v => v.lang.startsWith(lang.split('-')[0]));

    // Special case for Telugu (te-IN)
    if (!selectedVoice && lang.startsWith('te')) {
      selectedVoice = voices.find(v => v.lang.includes('te')) || 
                     voices.find(v => v.name.toLowerCase().includes('telugu')) ||
                     voices.find(v => v.lang.includes('tel'));
    }

    // Special case for Hindi (hi-IN)
    if (!selectedVoice && lang.startsWith('hi')) {
      selectedVoice = voices.find(v => v.lang.includes('hi')) || 
                     voices.find(v => v.name.toLowerCase().includes('hindi'));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(`Using Voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    } else {
      console.warn(`No native voice found for ${lang}. Browser default will be used.`);
    }

    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  // Check if voices are loaded
  if (window.speechSynthesis.getVoices().length === 0) {
    console.log('Voices not loaded yet, waiting...');
    window.speechSynthesis.onvoiceschanged = () => {
      attemptSpeak();
      window.speechSynthesis.onvoiceschanged = null; // Remove listener
    };
  } else {
    // Small delay to ensure cancel() finishes
    setTimeout(attemptSpeak, 100);
  }
};

/**
 * Stops any ongoing speech.
 */
export const stopSpeech = () => {
  window.speechSynthesis.cancel();
};
