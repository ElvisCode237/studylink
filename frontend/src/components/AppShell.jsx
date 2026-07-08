import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const items = [
  ['/', '⌂', 'Accueil'],
  ['/catalogue', '▤', 'Catalogue'],
  ['/bookings', '◉', 'Sessions'],
  ['/messages', '□', 'Messages'],
  ['/profile', '○', 'Profil'],
];

export function Logo() {
  return (
    <Link to="/" className="brand-lockup">
      <span className="brand-mark">◆</span>
      <span>StudyLink</span>
    </Link>
  );
}

export function PageHeader({ title, subtitle, back = false, actions = true }) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        {back ? <button className="icon-btn" onClick={() => history.back()}>←</button> : <Logo />}
        <div className="page-title-wrap">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <Link className="notif-btn" to="/alerts">♢<span>3</span></Link>}
    </div>
  );
}

export function AppShell({ children, wide = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const hideNav = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="app-bg">
      {!hideNav && (
        <aside className="desktop-sidebar">
          <Logo />
          <nav>
            {[
              ['/', '⌂', 'Accueil'], ['/search', '⌕', 'Tuteurs'], ['/catalogue', '▤', 'Catalogue'],
              ['/personal-development', '✦', 'Développement perso'], ['/entrepreneurship', '↗', 'Entrepreneuriat'],
              ['/bootcamps', '⚑', 'Bootcamps'], ['/career-prep', '◎', 'Carrière'], ['/materials', '▱', 'Documents'],
              ['/forum', '◌', 'Forum'], ['/messages', '□', 'Messages'], ['/bookings', '◉', 'Sessions'], ['/study-space', '⌂', 'Espace d’étude'], ['/profile', '○', 'Profil'],
              ...(user?.role === 'admin' ? [['/admin', '⚙', 'Administration']] : [])
            ].map(([to, icon, label]) => (
              <NavLink key={to} to={to} className={({isActive}) => isActive ? 'side-link active' : 'side-link'}>
                <span>{icon}</span>{label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-user">{user ? `Connecté · ${user.full_name?.split(' ')[0]}` : 'Mode découverte'}</div>
        </aside>
      )}
      <main className={hideNav ? 'auth-main' : `app-main ${wide ? 'wide' : ''}`}>{children}</main>
      {!hideNav && (
        <nav className="bottom-nav">
          {items.map(([to, icon, label]) => (
            <NavLink key={to} to={to} className={({isActive}) => isActive ? 'bottom-link active' : 'bottom-link'}>
              <span>{icon}</span><small>{label}</small>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export function Chip({ children, active = false, tone = 'blue' }) {
  return <span className={`chip ${active ? 'active' : ''} tone-${tone}`}>{children}</span>;
}

export function Card({ children, className = '' }) {
  return <section className={`ui-card ${className}`}>{children}</section>;
}

export function Progress({ value = 0 }) {
  return <div className="progress-track"><div className="progress-fill" style={{width: `${value}%`}} /></div>;
}

export function Avatar({ name='StudyLink', src, size='md' }) {
  return src ? <img className={`avatar ${size}`} src={src} alt={name} /> : <span className={`avatar avatar-fallback ${size}`}>{name.charAt(0)}</span>;
}
