import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient', specialization: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function formatError(err) {
    const errors = err.response?.data?.errors;
    if (Array.isArray(errors) && errors.length) {
      return errors.map((item) => `${item.path}: ${item.msg}`).join(', ');
    }
    return err.response?.data?.message || 'Unable to register. Please check your details and try again.';
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await register(form);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={submit} className="card w-full max-w-lg p-6">
        <h1 className="text-2xl font-bold">Create account</h1>
        <div className="mt-5 grid gap-3">
          <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" placeholder="Password" type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="patient">Patient</option><option value="doctor">Doctor</option></select>
          {form.role === 'doctor' && <input className="input" placeholder="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />}
        </div>
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary mt-5 w-full" disabled={submitting}>{submitting ? 'Registering...' : 'Register'}</button>
      </form>
    </main>
  );
}
