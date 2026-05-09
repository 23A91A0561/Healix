import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/pages/Auth.css';

const doctorLanguages = [
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Arabic',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Urdu',
  'Kannada',
  'Malayalam'
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient',
    specialization: '',
    qualification: '',
    experienceYears: '',
    consultationFee: '',
    languages: []
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isDoctor = form.role === 'doctor';
  const roleOptions = useMemo(() => [
    {
      value: 'patient',
      title: 'Patient',
      description: 'Book appointments and attend consultations.'
    },
    {
      value: 'doctor',
      title: 'Doctor',
      description: 'Manage appointments and create prescriptions.'
    }
  ], []);

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
      const user = await register({
        ...form,
        experienceYears: isDoctor ? Number(form.experienceYears) || 0 : 0,
        consultationFee: isDoctor ? Number(form.consultationFee) || 0 : 0
      });
      navigate(`/${user.role}`);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function updateLanguages(event) {
    const selectedLanguages = Array.from(event.target.selectedOptions, (option) => option.value);
    setForm({ ...form, languages: selectedLanguages });
  }

  return (
    <div className="auth-page">
      <section className="auth-showcase float-soft">
        <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
          Join Healix
        </span>
        <h1>Build better care journeys for every patient.</h1>
        <p>
          Register as a patient or doctor and access a complete telemedicine workflow built for speed, trust, and clarity.
        </p>

        <div className="auth-feature-grid">
          <article className="auth-feature-item">
            <strong>Quick onboarding</strong>
            <p>Create accounts with role-specific setup in one flow.</p>
          </article>
          <article className="auth-feature-item">
            <strong>Modern dashboards</strong>
            <p>Actionable insights and streamlined daily workflows.</p>
          </article>
          <article className="auth-feature-item">
            <strong>Responsive by default</strong>
            <p>Optimized for mobile, tablet, and desktop.</p>
          </article>
        </div>
      </section>

      <section className="auth-card fade-in-up">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Start your Healix experience in minutes.</p>

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              required
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="field password-wrap">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="Create a strong password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="field">
            <label>Account Type</label>
            <div className="role-grid">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`role-option ${form.role === option.value ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, role: option.value })}
                >
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {isDoctor ? (
            <>
              <div className="auth-inline-grid">
                <div className="field">
                  <label htmlFor="register-specialization">Specialization</label>
                  <input
                    id="register-specialization"
                    type="text"
                    placeholder="Cardiologist"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="register-qualification">Qualification</label>
                  <input
                    id="register-qualification"
                    type="text"
                    placeholder="MBBS, MD"
                    value={form.qualification}
                    onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="register-experience">Experience Years</label>
                  <input
                    id="register-experience"
                    type="number"
                    min="0"
                    placeholder="8"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="register-fee">Consultation Fee</label>
                  <input
                    id="register-fee"
                    type="number"
                    min="0"
                    placeholder="500"
                    value={form.consultationFee}
                    onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="register-languages">Languages You Can Speak</label>
                <select id="register-languages" multiple value={form.languages} onChange={updateLanguages}>
                  {doctorLanguages.map((language) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '8px 0 0' }}>
                  Hold Ctrl on Windows or Cmd on Mac to select multiple languages.
                </p>
              </div>
            </>
          ) : null}

          {error ? <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p> : null}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}
