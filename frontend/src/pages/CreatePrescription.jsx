import { useState } from "react";

import { useParams, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";

import API from "../api/axios";

import "../styles/pages/Booking.css";

const CreatePrescription = () => {
  const { appointmentId } = useParams();

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    complaintDescription: "",
    medicines: "",
    dosage: "",
    notes: "",
  });

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      await API.post(
        "/prescriptions",

        {
          appointmentId,

          ...formData,
        },

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert("Prescription Created");

      navigate("/doctor");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="booking-page">
      <Navbar />

      <div className="booking-shell">
        <section className="booking-card" style={{ maxWidth: 720, margin: "0 auto" }}>
          <p className="badge" style={{ margin: 0, background: "rgba(37,99,235,0.12)", color: "var(--primary-blue)" }}>
            Prescription tools
          </p>
          <h1 style={{ marginTop: 18 }}>
            Create Prescription
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Add medicines, dosage, and notes for the appointment.
          </p>

          <form onSubmit={submitHandler} style={{ display: "grid", gap: 12 }}>
            <div>
              <label htmlFor="prescription-complaint" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Complaint Description
              </label>
              <textarea
                id="prescription-complaint"
                placeholder="Describe the patient's complaints"
                style={{ width: "100%", minHeight: 80, borderRadius: 12, border: "1px solid var(--border-light)", padding: 12 }}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    complaintDescription: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="prescription-medicines" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Medicines
              </label>
              <textarea
                id="prescription-medicines"
                placeholder="List medicines"
                style={{ width: "100%", minHeight: 120, borderRadius: 12, border: "1px solid var(--border-light)", padding: 12 }}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    medicines: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="prescription-dosage" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Dosage
              </label>
              <textarea
                id="prescription-dosage"
                placeholder="Add dosage instructions"
                style={{ width: "100%", minHeight: 120, borderRadius: 12, border: "1px solid var(--border-light)", padding: 12 }}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dosage: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="prescription-notes" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Doctor notes
              </label>
              <textarea
                id="prescription-notes"
                placeholder="Write consultation notes"
                style={{ width: "100%", minHeight: 120, borderRadius: 12, border: "1px solid var(--border-light)", padding: 12 }}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notes: e.target.value,
                  })
                }
              />
            </div>

            <button className="btn btn-primary" type="submit">
              Save Prescription
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default CreatePrescription;
