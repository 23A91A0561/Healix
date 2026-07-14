import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import API from "../api/axios";
import Loader from "../components/Loader";
import Footer from "../components/Footer";
import PrescriptionCard from "../components/PrescriptionCard";
import "../styles/pages/Dashboard.css";

const MyPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadPrescriptions = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const { data } = await API.get("/prescriptions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setPrescriptions(data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    loadPrescriptions();
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
                    Medical documents
                  </p>
                  <h1>My Prescriptions</h1>
                  <p>View and download your medical prescriptions</p>
                </div>
              </div>
            </section>

            {loading ? (
              <Loader />
            ) : prescriptions.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(400px, 1fr))",
                  gap: "24px",
                  marginTop: "24px",
                }}
              >
                {prescriptions.map((prescription) => (
                  <PrescriptionCard
                    key={prescription._id}
                    prescription={prescription}
                  />
                ))}
              </div>
            ) : (
              <div
                className="empty-state"
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  marginTop: "40px",
                }}
              >
                <p style={{ fontSize: "18px", color: "var(--text-muted)" }}>
                  No prescriptions yet
                </p>
              </div>
            )}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default MyPrescriptions;
