import { useEffect, useMemo, useState } from "react";

import Navbar from "../components/Navbar";

import Sidebar from "../components/Sidebar";

import API from "../api/axios";

import AppointmentCard from "../components/AppointmentCard";

import StatsCard from "../components/StatsCard";

import Loader from "../components/Loader";

import Footer from "../components/Footer";

import { Link, useSearchParams } from "react-router-dom";

import { useToast } from "../utils/ToastContext";

import "../styles/pages/Dashboard.css";

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const activeTab = searchParams.get("tab") || "overview";

  const approveAppointment = async (id) => {
    try {
      const token = localStorage.getItem("accessToken");

      await API.patch(
        `/appointments/${id}/status`,
        { status: 'confirmed' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const { data } = await API.get("/appointments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAppointments(data);
      toast.success("Appointment approved successfully.", "Updated");
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Unable to approve appointment right now.");
    }
  };

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const token = localStorage.getItem("accessToken");

        const { data } = await API.get("/appointments", {
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

  const stats = useMemo(() => {
    const pending = appointments.filter((appointment) => appointment.status === "pending").length;
    const approved = appointments.filter((appointment) => appointment.status === "approved").length;
    const live = appointments.filter((appointment) => appointment.status === "live").length;
    const completed = appointments.filter((appointment) => appointment.status === "completed").length;

    return [
      { label: "Total requests", value: appointments.length, note: "All received appointment requests" },
      { label: "Pending review", value: pending, note: "Waiting for your approval" },
      { label: "Active sessions", value: live, note: "Live consultations right now" },
      { label: "Completed", value: completed, note: `${approved} approved and queued` },
    ];
  }, [appointments]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        <Sidebar role="doctor" open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="dashboard-main">
          <Navbar embedded={true} />

          <main className="dashboard-content">
        {activeTab === "overview" && (
          <>
        <section className="dashboard-hero">
          <div className="dashboard-hero-head">
            <div>
              <p className="badge" style={{ margin: 0, background: "rgba(37,99,235,0.12)", color: "var(--primary-blue)" }}>
                Doctor workspace
              </p>
              <h1>
                Doctor Dashboard
              </h1>
              <p>
                Review appointment requests, approve visits, and move patients into live consultations without leaving the dashboard.
              </p>
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
              <h2>Appointments</h2>
              <p>Approve upcoming consultations and start live sessions when ready.</p>
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
                  isDoctor={true}
                  approveAppointment={approveAppointment}
                />
              ))
            ) : (
              <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                <h3>No appointments yet</h3>
                <p>Patient requests will appear here once bookings begin coming in.</p>
              </div>
            )}
          </div>
        </section>

            <section className="dashboard-split">
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Patient details</h2>
                    <p>Recent patient queue and consultation statuses.</p>
                  </div>
                </div>

                <div className="panel-table-wrap">
                  <table className="panel-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0, 6).map((appointment) => (
                        <tr key={`p-${appointment._id}`}>
                          <td>{appointment.patientName}</td>
                          <td>{appointment.date}</td>
                          <td>
                            <span className={`status-badge ${appointment.status || "pending"}`}>
                              {appointment.status}
                            </span>
                          </td>
                          <td>
                            <Link to={`/prescription/${appointment._id}`} className="btn btn-secondary">
                              Rx
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Availability calendar</h2>
                    <p>Weekly availability planning snapshot.</p>
                  </div>
                </div>

                <div className="calendar-grid">
                  {Array.from({ length: 14 }).map((_, index) => (
                    <div key={`cal-${index}`} className={`calendar-cell ${index % 5 === 0 ? "active" : ""}`}>
                      Day {index + 1}
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}

        {activeTab === "consultations" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Live Consultations</h2>
                <p>Manage and join active video consultations with patients.</p>
              </div>
            </div>
            <div className="empty-state">
              <h3>No active consultations</h3>
              <p>Your live video sessions will appear here. Start a consultation from Appointments tab.</p>
            </div>
          </section>
        )}

        {activeTab === "patients" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Patients</h2>
                <p>View all your patients and their consultation history.</p>
              </div>
            </div>
            <div className="panel-table-wrap">
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Consultations</th>
                    <th>Last Visit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length > 0 ? (
                    appointments.map((apt) => (
                      <tr key={`patient-${apt._id}`}>
                        <td>{apt.patientName}</td>
                        <td>1</td>
                        <td>{apt.date}</td>
                        <td>
                          <span className={`status-badge ${apt.status || "pending"}`}>
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        No patients yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "appointments" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>All Appointments</h2>
                <p>View and manage all appointment requests and schedules.</p>
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
                    isDoctor={true}
                    approveAppointment={approveAppointment}
                  />
                ))
              ) : (
                <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                  <h3>No appointments</h3>
                  <p>Your appointments will appear here once bookings are made.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "prescriptions" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Prescriptions</h2>
                <p>Create and manage digital prescriptions for your patients.</p>
              </div>
            </div>
            <div className="panel-table-wrap">
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Medicines</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length > 0 ? (
                    appointments.map((apt) => (
                      <tr key={`rx-${apt._id}`}>
                        <td>{apt.patientName}</td>
                        <td>{apt.date}</td>
                        <td>
                          <Link to={`/prescription/${apt._id}`} className="btn btn-secondary" style={{ fontSize: "0.9rem", padding: "6px 10px" }}>
                            Create Rx
                          </Link>
                        </td>
                        <td>
                          <span className={`status-badge ${apt.status || "pending"}`}>
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        No prescriptions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
