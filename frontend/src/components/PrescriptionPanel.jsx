import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";
import "./PrescriptionPanel.css";

const emptyMedicine = { name: "", dosage: "", frequency: "", duration: "", days: 7 };

const PrescriptionPanel = ({ appointmentId, patientId, onSuccess }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    diagnosis: "",
    complaintDescription: "",
    notes: "",
    medicines: [{ ...emptyMedicine }],
  });

  const resolvedPatientId = useMemo(() => {
    if (!patientId) return "";
    return typeof patientId === "string" ? patientId : patientId?._id || "";
  }, [patientId]);

  useEffect(() => {
    console.log("PrescriptionPanel received:", {
      appointmentId,
      patientId,
      resolvedPatientId,
    });
  }, [appointmentId, patientId, resolvedPatientId]);

  const isDisabled = !resolvedPatientId || !appointmentId;

  const handleAddMedicine = () => {
    setFormData((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { ...emptyMedicine }],
    }));
  };

  const handleRemoveMedicine = (index) => {
    setFormData((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));
  };

  const handleMedicineChange = (index, field, value) => {
    setFormData((prev) => {
      const medicines = [...prev.medicines];
      medicines[index] = { ...medicines[index], [field]: value };
      return { ...prev, medicines };
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isDisabled) {
      setMessage("Loading appointment data, please wait.");
      return;
    }

    if (!formData.diagnosis.trim()) {
      setMessage("Please enter a main complaint.");
      return;
    }

    if (formData.medicines.some((med) => !med.name.trim())) {
      setMessage("Please fill in all medicine names.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await api.post("/prescriptions", {
        appointment: appointmentId,
        patient: resolvedPatientId,
        diagnosis: formData.diagnosis,
        complaintDescription: formData.complaintDescription,
        notes: formData.notes,
        medicines: formData.medicines.filter((med) => med.name.trim()),
      });

      setMessage("Prescription created successfully.");
      setFormData({
        diagnosis: "",
        complaintDescription: "",
        notes: "",
        medicines: [{ ...emptyMedicine }],
      });

      setTimeout(() => {
        setIsExpanded(false);
        onSuccess?.(response.data);
      }, 1200);
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="prescription-panel">
      <button
        className="prescription-toggle"
        onClick={() => !isDisabled && setIsExpanded((current) => !current)}
        disabled={isDisabled}
        title={isDisabled ? "Loading appointment data..." : "Add prescription"}
      >
        {isExpanded ? "Close Prescription" : isDisabled ? "Loading..." : "Add Prescription"}
      </button>

      {isExpanded && (
        <div className="prescription-drawer-shell" role="dialog" aria-label="Create prescription">
          <div className="prescription-drawer-backdrop" onClick={() => setIsExpanded(false)} />

          <aside className="prescription-form-container">
            <div className="prescription-drawer-header">
              <div>
                <span className="prescription-kicker">Digital Rx</span>
                <h3>Create Prescription</h3>
              </div>
              <button
                type="button"
                className="prescription-close"
                onClick={() => setIsExpanded(false)}
                aria-label="Close prescription panel"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="diagnosis">Main Complaint *</label>
                <textarea
                  id="diagnosis"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleInputChange}
                  placeholder="e.g., Severe headache, high fever"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="complaintDescription">Complaint Description</label>
                <textarea
                  id="complaintDescription"
                  name="complaintDescription"
                  value={formData.complaintDescription}
                  onChange={handleInputChange}
                  placeholder="Symptoms, duration, observations, and relevant history"
                  rows="4"
                />
              </div>

              <div className="form-group">
                <div className="section-heading">
                  <label>Medicines</label>
                  <button type="button" className="btn-add-medicine compact" onClick={handleAddMedicine}>
                    Add
                  </button>
                </div>

                <div className="medicines-list">
                  {formData.medicines.map((medicine, index) => (
                    <div key={index} className="medicine-item">
                      <div className="medicine-item-header">
                        <span>Medicine {index + 1}</span>
                        {formData.medicines.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove"
                            onClick={() => handleRemoveMedicine(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="medicine-row">
                        <input
                          type="text"
                          placeholder="Medicine name *"
                          value={medicine.name}
                          onChange={(event) => handleMedicineChange(index, "name", event.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Dosage, e.g. 500mg"
                          value={medicine.dosage}
                          onChange={(event) => handleMedicineChange(index, "dosage", event.target.value)}
                        />
                      </div>

                      <div className="medicine-row">
                        <input
                          type="text"
                          placeholder="Frequency, e.g. twice daily"
                          value={medicine.frequency}
                          onChange={(event) => handleMedicineChange(index, "frequency", event.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Timing, e.g. after meals"
                          value={medicine.duration}
                          onChange={(event) => handleMedicineChange(index, "duration", event.target.value)}
                        />
                      </div>

                      <input
                        type="number"
                        placeholder="Days"
                        value={medicine.days}
                        onChange={(event) => handleMedicineChange(index, "days", parseInt(event.target.value, 10) || 7)}
                        min="1"
                        max="90"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Suggestions / Special Instructions</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Rest, hydration, follow-up advice, warnings, or tests"
                  rows="3"
                />
              </div>

              {message && <div className="form-message">{message}</div>}

              <button type="submit" className="btn-submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Prescription"}
              </button>
            </form>

            <div className="prescription-resize-hint">Resize from the drawer edge</div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default PrescriptionPanel;
