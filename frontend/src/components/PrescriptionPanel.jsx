import { useState } from "react";
import API from "../api/axios";

const PrescriptionPanel = ({ appointmentId, onClose }) => {
  const [formData, setFormData] = useState({
    complaintDescription: "",
    medicines: "",
    dosage: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Healix generally uses "accessToken" or "token"
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
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
        }
      );
      alert("Prescription Created Successfully!");
      onClose();
    } catch (error) {
      console.error('Prescription error:', error.response?.data || error.message);
      alert(error.response?.data?.message || error.message || "Failed to create prescription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="prescription-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Create Prescription</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>
      
      <form onSubmit={submitHandler} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label htmlFor="panel-complaint" style={{ display: "block", marginBottom: 6, fontSize: "0.9rem", color: "#cbd5e1", fontWeight: 600 }}>Complaint Description</label>
          <textarea
            id="panel-complaint"
            placeholder="Describe the patient's complaints"
            required
            rows={3}
            value={formData.complaintDescription}
            onChange={(e) => setFormData({ ...formData, complaintDescription: e.target.value })}
            className="prescription-textarea"
          />
        </div>
        <div>
          <label htmlFor="panel-medicines" style={{ display: "block", marginBottom: 6, fontSize: "0.9rem", color: "#cbd5e1", fontWeight: 600 }}>Medicines</label>
          <textarea
            id="panel-medicines"
            placeholder="List medicines"
            required
            rows={4}
            value={formData.medicines}
            onChange={(e) => setFormData({ ...formData, medicines: e.target.value })}
            className="prescription-textarea"
          />
        </div>
        <div>
          <label htmlFor="panel-dosage" style={{ display: "block", marginBottom: 6, fontSize: "0.9rem", color: "#cbd5e1", fontWeight: 600 }}>Dosage Instructions</label>
          <textarea
            id="panel-dosage"
            placeholder="Add dosage instructions"
            required
            rows={4}
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
            className="prescription-textarea"
          />
        </div>
        <div>
          <label htmlFor="panel-notes" style={{ display: "block", marginBottom: 6, fontSize: "0.9rem", color: "#cbd5e1", fontWeight: 600 }}>Doctor Notes</label>
          <textarea
            id="panel-notes"
            placeholder="Write consultation notes"
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="prescription-textarea"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ marginTop: 8, padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>
          {isSubmitting ? "Saving..." : "Save Prescription"}
        </button>
      </form>
    </div>
  );
};

export default PrescriptionPanel;
