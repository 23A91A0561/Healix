import { Link } from "react-router-dom";
import "../styles/components/DoctorCard.css";

const DoctorCard = ({ doctor }) => {
  return (
    <article className="doctor-card fade-in-up">
      <div className="doctor-image-wrap">
        <img
          src={doctor.profileImage || "https://via.placeholder.com/400"}
          alt="doctor"
          className="doctor-image"
        />
      </div>

      <div className="doctor-body">
        <h2 className="doctor-name">Dr. {doctor.name}</h2>

        <p className="doctor-meta">{doctor.specialization}</p>

        <p className="doctor-meta">Experience: {doctor.experience}</p>

        <div className="doctor-rating">
          <span>4.8</span>
          <span>★</span>
          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Trusted specialist</span>
        </div>

        <p className="doctor-price">₹{doctor.consultationFee}</p>

        <div className="card-actions">
          <Link to={`/doctor-profile/${doctor._id}`}>
            <button className="btn btn-secondary" style={{ width: "100%" }}>
              View Profile
            </button>
          </Link>

          <Link to={`/book/${doctor._id}`}>
            <button className="btn btn-primary" style={{ width: "100%" }}>
              Book Appointment
            </button>
          </Link>
        </div>
      </div>
    </article>
  );
};

export default DoctorCard;
