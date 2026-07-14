import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import API from '../api/axios.js';
import '../styles/pages/CureAI.css';

// ─── Suggestion prompts shown on the welcome screen ────────────────────────
const STARTER_PROMPTS = [
  { icon: '🤒', text: 'I have a fever and sore throat. What should I do?' },
  { icon: '💊', text: 'What are the side effects of ibuprofen?' },
  { icon: '🩺', text: 'Which specialist should I see for chest pain?' },
  { icon: '🧠', text: 'I feel anxious all the time. Can you help?' },
  { icon: '🥗', text: 'What diet should I follow for high blood pressure?' },
  { icon: '😴', text: 'I have trouble sleeping — what can I do?' },
];

// ─── Format timestamp ────────────────────────────────────────────────────────
const fmt = (d) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ─── Parse simple markdown-like formatting ───────────────────────────────────
function formatText(text) {
  // Convert **bold** and bullet lines starting with - or •
  const lines = text.split('\n');
  const result = [];
  let inList = false;
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      result.push(
        <ul key={`ul-${result.length}`}>
          {listItems.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: li }} />)}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); result.push(<br key={`br-${i}`} />); return; }

    const isBullet = /^[-•*]\s/.test(trimmed);
    if (isBullet) {
      inList = true;
      const html = trimmed.replace(/^[-•*]\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      listItems.push(html);
    } else {
      flushList();
      const html = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      result.push(<p key={i} dangerouslySetInnerHTML={{ __html: html }} style={{ margin: '2px 0' }} />);
    }
  });
  flushList();
  return result;
}

// ─── Single message bubble ───────────────────────────────────────────────────
function Message({ msg, userName }) {
  const isUser = msg.role === 'user';
  const isEmergency = msg.isEmergency;

  return (
    <div className={`cure-ai-msg ${isUser ? 'user' : 'ai'} ${isEmergency ? 'emergency' : ''}`}>
      <div className="cure-ai-avatar">
        {isUser ? '👤' : '🧬'}
      </div>
      <div>
        <div className="cure-ai-bubble">
          {isEmergency && (
            <div className="cure-ai-emergency-banner">
              🚨 Emergency — Seek Help Now
            </div>
          )}
          <div>{isUser ? msg.text : formatText(msg.text)}</div>
          <span className="cure-ai-bubble-time">{fmt(msg.ts)}</span>
        </div>

        {/* Action chips only on AI messages */}
        {!isUser && msg.suggestions && (
          <div className="cure-ai-action-chips">
            {msg.suggestions.booking && (
              <Link to="/patient/book" className="cure-ai-action-chip">
                📅 Book Appointment
              </Link>
            )}
            {msg.suggestions.prescription && (
              <Link to="/patient/prescriptions" className="cure-ai-action-chip">
                💊 View Prescriptions
              </Link>
            )}
            {isEmergency && (
              <a href="tel:112" className="cure-ai-action-chip" style={{ borderColor: '#dc2626', background: '#fef2f2', color: '#dc2626' }}>
                📞 Call 112
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Cure AI Page ───────────────────────────────────────────────────────
export default function CureAI() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    setError('');
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg = { role: 'user', text: trimmed, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await API.post(
        '/chatbot/message',
        { message: trimmed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMsg = {
        role: 'ai',
        text: data.reply,
        isEmergency: data.isEmergency,
        suggestions: data.suggestions,
        ts: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setError('Failed to get a response. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await API.post('/chatbot/message', { message: '__reset__', reset: true }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (_) {}
    setMessages([]);
    setError('');
  };

  const isEmpty = messages.length === 0;

  return (
    <DashboardLayout>
      <div className="cure-ai-page">

        {/* Header */}
        <header className="cure-ai-header">
          <div className="cure-ai-logo">🧬</div>
          <div className="cure-ai-title-block">
            <h1>Cure AI</h1>
            <p>Your intelligent health assistant · Powered by Healix</p>
          </div>
          <div className="cure-ai-status">
            <span className="cure-ai-status-dot" />
            Online
          </div>
          {!isEmpty && (
            <button className="cure-ai-clear-btn" onClick={clearChat} title="Clear conversation">
              🗑 Clear
            </button>
          )}
        </header>

        {/* Messages */}
        <div className="cure-ai-messages">
          {isEmpty ? (
            <div className="cure-ai-welcome">
              <div className="cure-ai-welcome-icon">🧬</div>
              <h2>Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! I'm Cure AI</h2>
              <p>
                I'm your intelligent health companion on Healix. Ask me about symptoms,
                medications, specialist recommendations, or general wellness tips.
              </p>
              <div className="cure-ai-suggestions-grid">
                {STARTER_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    className="cure-ai-suggestion-chip"
                    onClick={() => sendMessage(p.text)}
                  >
                    <span>{p.icon}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <Message key={i} msg={msg} userName={user?.name} />
              ))}

              {loading && (
                <div className="cure-ai-msg ai">
                  <div className="cure-ai-avatar">🧬</div>
                  <div className="cure-ai-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', padding: '4px 0' }}>
                  ⚠️ {error}
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="cure-ai-input-area">
          <div className="cure-ai-input-row">
            <textarea
              ref={textareaRef}
              className="cure-ai-textarea"
              placeholder="Ask me about symptoms, medications, health tips…"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="cure-ai-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Send (Enter)"
            >
              ➤
            </button>
          </div>
          <p className="cure-ai-input-hint">
            Cure AI can make mistakes. Always consult a qualified doctor for medical decisions.
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}
