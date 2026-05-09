import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import "../styles/pages/Auth.css";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient",
    specialization: "",
    experience: "",
    consultationFee: "",
    profileImage: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleOptions = useMemo(
    () => [
      {
        value: "patient",
        title: "Patient",
        description: "Book appointments and attend consultations.",
      },
      {
        value: "doctor",
        title: "Doctor",
        description: "Manage appointments and create prescriptions.",
      },
    ],
    [],
  );

  const isDoctor = formData.role === "doctor";

  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await API.post("/auth/register", {
        ...formData,
        consultationFee: isDoctor ? Number(formData.consultationFee) || 0 : 0,
      });

      navigate("/login");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to create your account right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-showcase float-soft">
        <span className="badge" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
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

        <form onSubmit={submitHandler} className="auth-form">
          <div className="field">
            <label htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              required
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              type="email"
              required
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="field password-wrap">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((prev) => !prev)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="field">
            <label>Account Type</label>
            <div className="role-grid">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`role-option ${formData.role === option.value ? "active" : ""}`}
                  onClick={() => setFormData({ ...formData, role: option.value })}
                >
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {isDoctor ? (
            <div className="auth-inline-grid">
              <div className="field">
                <label htmlFor="register-specialization">Specialization</label>
                <input
                  id="register-specialization"
                  type="text"
                  placeholder="Cardiologist"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="register-experience">Experience</label>
                <input
                  id="register-experience"
                  type="text"
                  placeholder="8 years"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="register-fee">Consultation Fee</label>
                <input
                  id="register-fee"
                  type="number"
                  min="0"
                  placeholder="500"
                  value={formData.consultationFee}
                  onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="register-image">Profile Image URL</label>
                <input
                  id="register-image"
                  type="url"
                  placeholder="https://..."
                  value={formData.profileImage}
                  onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                />
              </div>
            </div>
          ) : null}

          {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
};

export default Register;
