import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import API from "../api/axios";
import "../styles/pages/Dashboard.css";

const PatientProfile = () => {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadPatientProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await API.get("/auth/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setPatient(data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    loadPatientProfile();
  }, []);

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  if (!patient) {
    return <div className="loading-state">No profile data found</div>;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        <Sidebar role="patient" open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="dashboard-main">
          <Navbar embedded={true} />

          <main className="dashboard-content">
            <div className="profile-card profile-grid">
              <div>
                <img
                  src={patient.profileImage || "https://via.placeholder.com/600"}
                  alt="patient"
                  className="profile-image"
                />
              </div>

              <div className="profile-body">
                <h1>{patient.name}</h1>

                <p>Patient Account</p>

                <div className="info-list">
                  <div className="info-item">
                    <span>Email</span>
                    <strong>{patient.email}</strong>
                  </div>

                  <div className="info-item">
                    <span>Age</span>
                    <strong>{patient.age || "Not provided"}</strong>
                  </div>

                  <div className="info-item">
                    <span>Gender</span>
                    <strong>{patient.gender || "Not provided"}</strong>
                  </div>

                  <div className="info-item">
                    <span>Phone</span>
                    <strong>{patient.phone || "Not provided"}</strong>
                  </div>
                </div>

                <p style={{ marginTop: 24 }}>
                  Your health profile information. Keep your details updated for better healthcare services.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
