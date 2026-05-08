import { Link } from 'react-router-dom';
import { FaBell, FaNotesMedical } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary"><FaNotesMedical /> Healix</Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link className="btn-light" to="/doctors">Doctors</Link>
          <Link className="btn-light" to="/emergency">Emergency</Link>
          {user ? (
            <>
              <Link className="btn-light" to="/notifications"><FaBell /></Link>
              <Link className="btn-primary" to={`/${user.role}`}>Dashboard</Link>
              <button className="btn-light" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link className="btn-primary" to="/login">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
