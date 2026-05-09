import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/pages/Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'patient1@healix.test', password: 'Password123!' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-showcase float-soft">
        <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
          Healix Secure Access
        </span>
        <h1>Healthcare access designed for modern care teams.</h1>
        <p>
          Log in to manage appointments, consultations, prescriptions, and patient history from one premium healthcare dashboard.
        </p>

        <div className="auth-feature-grid">
          <article className="auth-feature-item">
            <strong>Real-time sessions</strong>
            <p>Video consultations with secure access controls.</p>
          </article>
          <article className="auth-feature-item">
            <strong>Smart workflows</strong>
            <p>Appointment and prescription lifecycle in one place.</p>
          </article>
          <article className="auth-feature-item">
            <strong>Role-based dashboards</strong>
            <p>Tailored patient, doctor, and admin experiences.</p>
          </article>
        </div>
      </section>

      <section className="auth-card fade-in-up">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue with Healix.</p>

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="field password-wrap">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error ? <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          New to Healix? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
}
