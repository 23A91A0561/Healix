import { useEffect, useState } from "react";

import { useParams, Link } from "react-router-dom";

import API from "../api/axios";

import Navbar from "../components/Navbar";

import "../styles/pages/Dashboard.css";

const DoctorProfile = () => {
  const { doctorId } = useParams();

  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    const loadDoctor = async () => {
      try {
        const { data } = await API.get("/auth/doctors");

        const selectedDoctor = data.find((doc) => doc._id === doctorId);

        setDoctor(selectedDoctor);
      } catch (error) {
        console.log(error);
      }
    };

    loadDoctor();
  }, [doctorId]);

  if (!doctor) {
    return <div className="loading-state">Loading...</div>;
  }

  return (
    <div className="dashboard-page">
      <Navbar />

      <div className="dashboard-content">
        <div className="profile-card profile-grid">
          <div>
            <img
              src={doctor.profileImage || "https://via.placeholder.com/600"}
              alt="doctor"
              className="profile-image"
            />
          </div>

          <div className="profile-body">
            <h1>Dr. {doctor.name}</h1>

            <p>{doctor.specialization}</p>

            <div className="info-list">
              <div className="info-item">
                <span>Experience</span>
                <strong>{doctor.experience}</strong>
              </div>

              <div className="info-item">
                <span>Consultation Fee</span>
                <strong>₹{doctor.consultationFee}</strong>
              </div>

              <div className="info-item">
                <span>Availability</span>
                <strong style={{ color: "var(--success)" }}>
                  Available Today
                </strong>
              </div>
            </div>

            <p style={{ marginTop: 24 }}>
              Experienced healthcare professional providing quality telemedicine consultation and patient care.
            </p>

            <Link to={`/book/${doctor._id}`} className="btn btn-primary" style={{ marginTop: 22 }}>
              Book Appointment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
