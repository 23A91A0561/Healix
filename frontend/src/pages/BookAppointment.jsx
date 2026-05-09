import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import Navbar from "../components/Navbar";
import "../styles/pages/Booking.css";

const slots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const BookAppointment = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ date: "", time: "" });
  const [step, setStep] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const canContinue = useMemo(() => {
    if (step === 1) {
      return Boolean(formData.date);
    }
    if (step === 2) {
      return Boolean(formData.time);
    }
    return true;
  }, [step, formData]);

  const confirmBooking = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      await API.post(
        "/appointments",
        { doctor: doctorId, ...formData },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setShowConfirm(false);
      navigate("/patient");
    } catch (error) {
      console.log(error);
      setShowConfirm(false);
      alert("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-page">
      <Navbar />

      <main className="booking-shell">
        <section className="booking-card fade-in-up">
          <span className="badge" style={{ background: "rgba(37,99,235,0.12)", color: "var(--primary-blue)" }}>
            Appointment booking flow
          </span>
          <h1 style={{ marginBottom: 6 }}>Book Appointment</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
            Choose your date and time in a guided step-by-step process.
          </p>

          <div className="booking-steps">
            <div className={`booking-step ${step >= 1 ? "active" : ""}`}>Step 1: Date</div>
            <div className={`booking-step ${step >= 2 ? "active" : ""}`}>Step 2: Time</div>
            <div className={`booking-step ${step >= 3 ? "active" : ""}`}>Step 3: Confirm</div>
          </div>

          {step === 1 ? (
            <div className="booking-grid">
              <div>
                <label htmlFor="appointment-date" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Select date
                </label>
                <input
                  id="appointment-date"
                  type="date"
                  required
                  style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border-light)", padding: 12 }}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="booking-summary">
                <strong>Booking Summary</strong>
                <p style={{ marginBottom: 0, color: "var(--text-muted)" }}>Doctor ID: {doctorId}</p>
                <p style={{ marginBottom: 0, color: "var(--text-muted)" }}>Date: {formData.date || "Not selected"}</p>
                <p style={{ marginBottom: 0, color: "var(--text-muted)" }}>Time: {formData.time || "Not selected"}</p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p style={{ marginTop: 0, color: "var(--text-muted)" }}>Select an available time slot.</p>
              <div className="slot-grid">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`slot-btn ${formData.time === slot ? "active" : ""}`}
                    onClick={() => setFormData({ ...formData, time: slot })}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="booking-summary">
              <strong>Review your appointment</strong>
              <p style={{ marginBottom: 0, color: "var(--text-muted)" }}>Doctor ID: {doctorId}</p>
              <p style={{ marginBottom: 0, color: "var(--text-muted)" }}>Date: {formData.date}</p>
              <p style={{ marginBottom: 0, color: "var(--text-muted)" }}>Time: {formData.time}</p>
            </div>
          ) : null}

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              disabled={step === 1}
            >
              Back
            </button>

            {step < 3 ? (
              <button
                className="btn btn-primary"
                type="button"
                disabled={!canContinue}
                onClick={() => setStep((prev) => Math.min(3, prev + 1))}
              >
                Continue
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => setShowConfirm(true)}>
                Confirm Booking
              </button>
            )}
          </div>
        </section>
      </main>

      {showConfirm ? (
        <div className="modal-backdrop">
          <div className="modal-card fade-in-up">
            <h3 style={{ marginTop: 0 }}>Confirm appointment</h3>
            <p style={{ color: "var(--text-muted)" }}>
              You are booking a consultation on {formData.date} at {formData.time}.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmBooking} disabled={loading}>
                {loading ? "Booking..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BookAppointment;
