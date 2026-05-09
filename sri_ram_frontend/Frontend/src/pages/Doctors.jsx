import { useEffect, useMemo, useState } from "react";

import API from "../api/axios";

import Navbar from "../components/Navbar";

import DoctorCard from "../components/DoctorCard";

import "../styles/pages/Dashboard.css";

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);

  const [search, setSearch] = useState("");

  const [specialization, setSpecialization] = useState("All");

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const { data } = await API.get("/auth/doctors");

        setDoctors(data);
      } catch (error) {
        console.log(error);
      }
    };

    loadDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const matchesSearch =
        !search || doctor.name.toLowerCase().includes(search.toLowerCase());
      const matchesSpecialization =
        specialization === "All" || doctor.specialization === specialization;

      return matchesSearch && matchesSpecialization;
    });
  }, [doctors, search, specialization]);

  return (
    <div className="dashboard-page">
      <Navbar />

      <main className="dashboard-content">
        <section className="dashboard-hero">
          <div className="dashboard-hero-head">
            <div>
              <p className="badge" style={{ margin: 0, background: "rgba(37,99,235,0.12)", color: "var(--primary-blue)" }}>
                Directory
              </p>
              <h1>
                Find Doctors
              </h1>
              <p>
                Search specialists, compare profiles, and book appointments with the right doctor.
              </p>
            </div>
          </div>
        </section>

        <section className="filters-panel">
          <div className="input-shell">
            <label htmlFor="doctor-search">
              Search doctors
            </label>
            <input
              id="doctor-search"
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="input-shell">
            <label htmlFor="doctor-specialization">
              Specialization
            </label>
            <select
              id="doctor-specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            >
              <option>All</option>
              <option>Cardiologist</option>
              <option>Dermatologist</option>
              <option>Neurologist</option>
              <option>Orthopedic</option>
              <option>Pediatrician</option>
            </select>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Available doctors</h2>
              <p>Browse providers and choose the right consultation path.</p>
            </div>
          </div>

          <div className="doctor-grid">
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map((doctor) => (
                <DoctorCard key={doctor._id} doctor={doctor} />
              ))
            ) : (
              <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                <h3>No doctors found</h3>
                <p>Adjust your search or specialization filter to discover more doctors.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Doctors;
