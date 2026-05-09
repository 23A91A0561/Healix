import { Link } from "react-router-dom";
import "../styles/components/AppointmentCard.css";

const AppointmentCard = ({ appointment, isDoctor, approveAppointment }) => {
  const statusClass = appointment.status || "pending";

  return (
    <article className="appointment-card">
      <div className="appointment-body">
        <h2 className="appointment-name">
          {isDoctor ? appointment.patientName : `Dr. ${appointment.doctorName}`}
        </h2>

        <p className="appointment-meta">Date: {appointment.date}</p>

        <p className="appointment-meta">Time: {appointment.time}</p>

        <div className="status-row">
          <span className={`status-pill ${statusClass}`}>{appointment.status}</span>
        </div>

        {isDoctor && appointment.status === "pending" && (
          <div className="appointment-actions">
            <button
              onClick={() => approveAppointment(appointment._id)}
              className="btn btn-primary"
            >
              Approve Appointment
            </button>
          </div>
        )}

        {(appointment.status === "approved" || appointment.status === "live") && (
          <div className="appointment-actions">
            <Link
              to={`/consultation/${appointment._id}/${appointment.consultationRoom}`}
              className="btn btn-primary"
            >
              {isDoctor ? "Start Consultation" : "Join Consultation"}
            </Link>
          </div>
        )}

        {isDoctor && appointment.status === "completed" && (
          <div className="appointment-actions">
            <Link to={`/prescription/${appointment._id}`} className="btn btn-secondary">
              Create Prescription
            </Link>
          </div>
        )}
      </div>
    </article>
  );
};

export default AppointmentCard;
