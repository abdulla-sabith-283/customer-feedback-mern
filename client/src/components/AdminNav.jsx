import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function AdminNav() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('softrate_token');
    navigate('/admin/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M8 21l4-3h9" />
        </svg>
        <span>SOFTRATE TECH</span>
      </Link>

      <div className="nav-links">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          Inbox
        </NavLink>
        <NavLink
          to="/admin/analytics"
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          Analytics
        </NavLink>
        <NavLink
          to="/admin/settings"
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          Settings
        </NavLink>
        <ThemeToggle />
        <button type="button" className="btn btn-outline" onClick={logout}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
}
