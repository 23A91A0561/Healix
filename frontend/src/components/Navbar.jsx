import { Link } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/components/Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'H';

  return (
    <header className="navbar glass">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">H</span>
        <span>
          <span>Healix</span>
          <small style={{ color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
            Connected care platform
          </small>
        </span>
      </Link>

      <div className="navbar-actions">
        <Link className="btn btn-secondary" to="/doctors">Doctors</Link>
        <Link className="btn btn-secondary" to="/emergency">Emergency</Link>
        {user ? (
          <>
            <Link className="btn btn-secondary" aria-label="Notifications" to="/notifications"><FaBell /></Link>
            <Link className="btn btn-primary" to={`/${user.role}`}>Dashboard</Link>
            <div className="user-chip">
              <span className="user-avatar">{initial}</span>
              <span>{user.name}</span>
            </div>
            <button className="btn btn-secondary" type="button" onClick={logout}>Sign out</button>
          </>
        ) : (
          <Link className="btn btn-primary" to="/login">Sign in</Link>
        )}
      </div>
    </header>
  );
}
