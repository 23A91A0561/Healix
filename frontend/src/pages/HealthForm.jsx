import { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import api from '../services/api.js';

export default function HealthForm() {
  const [form, setForm] = useState({});
  async function submit(e) { e.preventDefault(); await api.post('/appointments/current/health-form', form); alert('Health form saved'); }
  return <DashboardLayout><form onSubmit={submit} className="card max-w-2xl p-6"><h1 className="text-2xl font-bold">Pre-consultation form</h1><div className="mt-5 grid gap-3 md:grid-cols-2">{['weight','height','age','gender','bloodPressure','sugarLevel'].map((k) => <input className="input" key={k} placeholder={k} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />)}</div><button className="btn-primary mt-5">Save</button></form></DashboardLayout>;
}
