import { useEffect, useMemo, useState } from "react";

import Navbar from "../components/Navbar";

import Sidebar from "../components/Sidebar";

import API from "../api/axios";

import AppointmentCard from "../components/AppointmentCard";

import StatsCard from "../components/StatsCard";

import Loader from "../components/Loader";

import Footer from "../components/Footer";

import { Link } from "react-router-dom";

import "../styles/pages/Dashboard.css";

const PatientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stats = useMemo(() => {
    const pending = appointments.filter((appointment) => appointment.status === "pending").length;
    const approved = appointments.filter((appointment) => appointment.status === "approved").length;
    const live = appointments.filter((appointment) => appointment.status === "live").length;
    const completed = appointments.filter((appointment) => appointment.status === "completed").length;

    return [
      { label: "All visits", value: appointments.length, note: "Scheduled and completed consultations" },
      { label: "Pending", value: pending, note: "Awaiting doctor approval" },
      { label: "Approved", value: approved, note: "Ready to start soon" },
      { label: "Live now", value: live, note: `${completed} completed visits recorded` },
    ];
  }, [appointments]);

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
              <p className="badge" style={{ margin: 0, background: "rgba(37,99,235,0.12)", color: "var(--primary-blue)" }}>
                Patient workspace
              </p>
              <h1>
                Patient Dashboard
              </h1>
              <p>
                Keep track of bookings, join consultations, and explore doctors from one organized space.
              </p>
            </div>

            <div>
              <Link to="/doctors" className="btn btn-primary">
                Book Appointment
              </Link>
            </div>
          </div>

              <div className="stats-grid">
                {stats.map((stat) => (
                  <StatsCard key={stat.label} {...stat} />
                ))}
              </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Your appointments</h2>
              <p>Review consultation status and jump into live sessions when they are ready.</p>
            </div>
          </div>

          <div className="appointment-grid">
            {loading ? (
              <Loader variant="skeleton-cards" count={4} />
            ) : appointments.length > 0 ? (
              appointments.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                />
              ))
            ) : (
              <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                <h3>No appointments yet</h3>
                <p>Book your first consultation to see it appear here.</p>
              </div>
            )}
          </div>
        </section>

            <section className="dashboard-split">
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Prescription history</h2>
                    <p>Recent prescriptions from your completed consultations.</p>
                  </div>
                </div>

                <div className="mini-list">
                  {appointments.slice(0, 4).map((appointment) => (
                    <div key={`rx-${appointment._id}`} className="mini-item">
                      <div>
                        <strong>Dr. {appointment.doctorName}</strong>
                        <p>{appointment.date} · {appointment.status}</p>
                      </div>
                      <span className={`status-badge ${appointment.status || "pending"}`}>
                        {appointment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Notifications</h2>
                    <p>Stay updated with appointment alerts.</p>
                  </div>
                </div>

                <div className="mini-list">
                  <div className="mini-item">
                    <div>
                      <strong>Consultation reminder</strong>
                      <p>Your session starts in 30 minutes.</p>
                    </div>
                    <span className="status-badge approved">New</span>
                  </div>
                  <div className="mini-item">
                    <div>
                      <strong>Prescription uploaded</strong>
                      <p>Doctor added updated medicine notes.</p>
                    </div>
                    <span className="status-badge live">Info</span>
                  </div>
                </div>
              </article>
            </section>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
