import "../styles/components/Navbar.css";

const Navbar = ({ embedded = false }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "H";

  return (
    <header className={`navbar glass ${embedded ? "navbar-embedded" : ""}`}>
      <div className="navbar-brand">
        <span className="navbar-logo">H</span>
        <div>
          <div>Healix</div>
          <small style={{ color: "var(--text-muted)", fontWeight: 600 }}>
            Connected care platform
          </small>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="user-chip">
          <span className="user-avatar">{initial}</span>
          <span>{user?.name || "Guest"}</span>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => {
            localStorage.clear();
            window.location.href = "/login";
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
};

export default Navbar;
