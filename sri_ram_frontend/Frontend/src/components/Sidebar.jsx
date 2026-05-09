import { Link, useLocation } from "react-router-dom";
import "../styles/components/Sidebar.css";

const Sidebar = ({ role = "patient", open, setOpen }) => {
  const location = useLocation();

  const patientLinks = [
    { to: "/patient", label: "Dashboard", icon: "📊" },
    { to: "/doctors", label: "Book Appointment", icon: "📅" },
    { to: "/appointments", label: "My Appointments", icon: "📋" },
    { to: "/my-prescriptions", label: "My Prescriptions", icon: "💊" },
    { to: "/patient-profile", label: "My Profile", icon: "👤" },
  ];

  const doctorLinks = [
    { to: "/doctor", label: "Dashboard", icon: "📊" },
    { to: "/doctor?tab=consultations", label: "Consultations", icon: "🎥" },
    { to: "/doctor?tab=patients", label: "Patients", icon: "👥" },
    { to: "/doctor?tab=appointments", label: "Appointments", icon: "📅" },
    { to: "/doctor?tab=prescriptions", label: "Prescriptions", icon: "💊" },
  ];

  const links = role === "doctor" ? doctorLinks : patientLinks;

  return (
    <>
      <button className="sidebar-mobile-toggle" type="button" onClick={() => setOpen((prev) => !prev)}>
        Menu
      </button>

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <div className="sidebar-brand-mark">H</div>
          <div>
            <strong>Healix</strong>
            <p>{role === "doctor" ? "Doctor Workspace" : "Patient Workspace"}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => {
            const active = location.pathname === link.to;

            return (
              <Link
                key={`${link.to}-${link.label}`}
                to={link.to}
                className={`sidebar-link ${active ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="sidebar-icon">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {open ? <div className="sidebar-overlay" onClick={() => setOpen(false)} /> : null}
    </>
  );
};

export default Sidebar;
