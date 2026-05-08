import { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import api from '../services/api.js';

export default function Assistant() {
  const [text, setText] = useState('I have headache since 2 days');
  const [messages, setMessages] = useState([]);
  async function send(e) {
    e.preventDefault();
    const { data } = await api.post('/ai/analyze', { text });
    setMessages([...messages, { role: 'user', text }, { role: 'assistant', text: data.analysis.response, analysis: data.analysis }]);
    setText('');
  }
  return <DashboardLayout><h1 className="text-3xl font-bold">Health Assistant</h1><div className="card mt-6 p-5"><div className="h-96 space-y-3 overflow-auto">{messages.map((m, i) => <div key={i} className={`rounded-md p-3 text-sm ${m.role === 'user' ? 'ml-auto bg-blue-50' : 'bg-slate-50'}`}>{m.text}</div>)}</div><form onSubmit={send} className="mt-4 flex gap-3"><input className="input" value={text} onChange={(e) => setText(e.target.value)} /><button className="btn-primary">Send</button></form></div></DashboardLayout>;
}
