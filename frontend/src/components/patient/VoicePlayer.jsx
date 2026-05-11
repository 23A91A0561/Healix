import { useEffect, useState, useRef } from 'react';
import { FaPause, FaPlay, FaVolumeUp } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * VoicePlayer component for playing text-to-speech audio.
 * Uses Backend TTS for reliability, especially for Telugu and Hindi.
 */
export default function VoicePlayer({ text, language = 'en', label = 'Listen' }) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Reset speaking state when language or text changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, [language, text]);

  const langMap = {
    en: 'en-US',
    hi: 'hi-IN',
    te: 'te-IN'
  };

  /**
   * Handles play/stop toggle using backend TTS.
   */
  const handleSpeak = async () => {
    if (!text?.trim()) return;

    if (speaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeaking(false);
    } else {
      try {
        setSpeaking(true);
        const browserLang = langMap[language] || language;
        
        // Construct backend TTS URL
        const ttsUrl = `${API_BASE_URL}/ai/speak?text=${encodeURIComponent(text)}&lang=${browserLang}`;
        
        console.log(`Fetching backend TTS for ${browserLang}...`);
        
        const audio = new Audio(ttsUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setSpeaking(false);
          audioRef.current = null;
        };

        audio.onerror = (e) => {
          console.error('Backend TTS failed:', e);
          setSpeaking(false);
          audioRef.current = null;
          // You could add a fallback to window.speechSynthesis here if desired
        };

        await audio.play();
      } catch (err) {
        console.error('Error playing audio:', err);
        setSpeaking(false);
      }
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
        {speaking ? <FaPause className="animate-pulse" /> : <FaVolumeUp />}
        <span>{speaking ? 'Stop' : label}</span>
        {!speaking && <FaPlay className="text-xs opacity-80" />}
      </button>
    </div>
  );
}
