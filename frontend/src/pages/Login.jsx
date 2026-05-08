import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'patient1@healix.test', password: 'Password123!' });
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    try { const user = await login(form); navigate(`/${user.role}`); } catch (err) { setError(err.response?.data?.message || err.message); }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={submit} className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to continue care coordination.</p>
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <input className="input mt-5" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input mt-3" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary mt-5 w-full">Login</button>
        <Link className="mt-4 block text-center text-sm text-primary" to="/register">Create an account</Link>
      </form>
    </main>
  );
}
