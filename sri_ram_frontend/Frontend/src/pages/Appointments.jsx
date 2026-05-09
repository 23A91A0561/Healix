import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AppointmentCard from "../components/AppointmentCard";
import API from "../api/axios";
import Loader from "../components/Loader";
import Footer from "../components/Footer";
import "../styles/pages/Dashboard.css";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await API.get("/appointments/patient", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAppointments(data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        <Sidebar role="patient" open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="dashboard-main">
          <Navbar embedded={true} />

          <main className="dashboard-content">
            <section className="dashboard-hero">
              <div className="dashboard-hero-head">
                <div>
                  <p
                    className="badge"
                    style={{
                      margin: 0,
                      background: "rgba(37,99,235,0.12)",
                      color: "var(--primary-blue)",
                    }}
                  >
                    My appointments
                  </p>
                  <h1>Appointment History</h1>
                  <p>
                    View and manage all your medical appointments
                  </p>
                </div>
              </div>
            </section>

            {loading ? (
              <Loader />
            ) : appointments.length > 0 ? (
              <section className="appointment-grid">
                {appointments.map((appointment) => (
                  <AppointmentCard key={appointment._id} appointment={appointment} />
                ))}
              </section>
            ) : (
              <div className="empty-state">
                <p>No appointments scheduled yet</p>
              </div>
            )}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Appointments;
