import { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./PrescriptionCard.css";

const PrescriptionCard = ({ prescription }) => {
  const prescriptionRef = useRef();

  const downloadAsImage = async () => {
    try {
      const canvas = await html2canvas(prescriptionRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `prescription-${prescription._id}.png`;
      link.click();
    } catch (error) {
      console.log("Error downloading image:", error);
    }
  };

  const downloadAsPDF = async () => {
    try {
      const canvas = await html2canvas(prescriptionRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`prescription-${prescription._id}.pdf`);
    } catch (error) {
      console.log("Error downloading PDF:", error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="prescription-container">
      <div className="prescription-actions">
        <button className="btn-download" onClick={downloadAsImage}>
          📷 Download as Image
        </button>
        <button className="btn-download" onClick={downloadAsPDF}>
          📄 Download as PDF
        </button>
      </div>

      <div ref={prescriptionRef} className="prescription-document">
        {/* Header */}
        <div className="prescription-header">
          <div className="prescription-hospital-name">
            <h2>🏥 Healix Medical Center</h2>
            <p>Professional Healthcare Services</p>
          </div>
          <div className="prescription-id">
            <p>
              <strong>Rx ID:</strong> {prescription._id.slice(-8).toUpperCase()}
            </p>
            <p>
              <strong>Date:</strong> {formatDate(prescription.createdAt)}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="prescription-divider" />

        {/* Doctor and Patient Info */}
        <div className="prescription-info-grid">
          <div className="prescription-info-block">
            <h4>DOCTOR INFORMATION</h4>
            <p>
              <strong>Dr. {prescription.doctor?.name}</strong>
            </p>
            <p>Registration ID: {prescription.doctor?._id?.slice(-6)}</p>
          </div>

          <div className="prescription-info-block">
            <h4>PATIENT INFORMATION</h4>
            <p>
              <strong>Name:</strong> {prescription.patient?.name || "N/A"}
            </p>
            <p>
              <strong>Age:</strong> {prescription.patient?.age || "N/A"}
            </p>
            <p>
              <strong>Email:</strong> {prescription.patient?.email || "N/A"}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="prescription-divider" />

        {/* Medicines */}
        <div className="prescription-section">
          <h4>MEDICINES</h4>
          <div className="prescription-content">
            {prescription.medicines ? (
              <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.8" }}>
                {prescription.medicines}
              </p>
            ) : (
              <p>No medicines prescribed</p>
            )}
          </div>
        </div>

        {/* Dosage */}
        <div className="prescription-section">
          <h4>DOSAGE INSTRUCTIONS</h4>
          <div className="prescription-content">
            {prescription.dosage ? (
              <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.8" }}>
                {prescription.dosage}
              </p>
            ) : (
              <p>No dosage instructions provided</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="prescription-section">
          <h4>DOCTOR'S NOTES</h4>
          <div className="prescription-content">
            {prescription.notes ? (
              <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.8" }}>
                {prescription.notes}
              </p>
            ) : (
              <p>No additional notes</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="prescription-divider" />

        {/* Footer */}
        <div className="prescription-footer">
          <div className="prescription-signature">
            <div className="signature-line" />
            <p>Doctor's Signature</p>
          </div>
          <div className="prescription-stamp">
            <p>DIGITAL PRESCRIPTION</p>
            <p>Valid and Verified</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="prescription-disclaimer">
          <p>
            This is a digitally generated prescription. Please consult with
            your doctor for any clarifications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionCard;
