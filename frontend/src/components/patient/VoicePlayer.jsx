import { useEffect, useState } from 'react';
import { FaPause, FaPlay, FaVolumeUp } from 'react-icons/fa';
import { speakText, stopSpeech } from '../../utils/speechHelper.js';

/**
 * VoicePlayer component for playing text-to-speech audio.
 * Uses Browser SpeechSynthesis via speechHelper.js.
 */
export default function VoicePlayer({ text, language = 'en', label = 'Listen' }) {
  const [speaking, setSpeaking] = useState(false);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Reset speaking state when language or text changes
  useEffect(() => {
    stopSpeech();
    setSpeaking(false);
  }, [language, text]);

  /**
   * Mapping of internal language codes to SpeechSynthesis language codes.
   */
  const langMap = {
    en: 'en-US',
    hi: 'hi-IN',
    te: 'te-IN'
  };

  /**
   * Handles play/stop toggle.
   */
  const handleSpeak = () => {
    if (!text?.trim()) return;

    if (speaking) {
      stopSpeech();
      setSpeaking(false);
    } else {
      if (!window.speechSynthesis) {
        console.error('Speech synthesis not supported in this browser.');
        return;
      }
      
      setSpeaking(true);
      const browserLang = langMap[language] || language;
      console.log(`Attempting to speak in ${browserLang}...`);
      speakText(text, browserLang);
      
      // Monitor speech end to reset state
      const checkSpeaking = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setSpeaking(false);
          clearInterval(checkSpeaking);
        }
      }, 500);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleSpeak}
        disabled={!text?.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {speaking ? <FaPause /> : <FaVolumeUp />}
        <span>{speaking ? 'Stop' : label}</span>
        {!speaking && <FaPlay className="text-xs opacity-80" />}
      </button>
    </div>
  );
}
