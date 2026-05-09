import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import "../styles/pages/Auth.css";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await API.post("/auth/login", formData);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "doctor") {
        navigate("/doctor");
      } else {
        navigate("/patient");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-showcase float-soft">
        <span className="badge" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
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
            <p>Tailored patient and doctor experiences.</p>
          </article>
        </div>
      </section>

      <section className="auth-card fade-in-up">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue with Healix.</p>

        <form onSubmit={submitHandler} className="auth-form">
          <div className="field">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="field password-wrap">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          New to Healix? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
};

export default Login;
