import { NavLink, Outlet } from 'react-router-dom'

const GROUPS = [
  {
    label: 'Général',
    items: [
      { to: '/', label: 'Accueil', icon: '🏠', end: true, badge: 1 },
      { to: '/objectifs', label: 'Objectifs', icon: '🎯', badge: 2 },
      { to: '/todo', label: 'To-Do', icon: '✅', badge: 3 },
    ],
  },
  {
    label: 'Temps',
    items: [
      { to: '/calendrier', label: '168 Heures', icon: '🗓️', badge: 4 },
      { to: '/blueprint', label: 'Blueprint', icon: '🧭', badge: 5 },
    ],
  },
  {
    label: 'Vie',
    items: [
      { to: '/finances', label: 'Finances', icon: '💰', badge: 6 },
      { to: '/journal', label: 'Journal', icon: '📔', badge: 7 },
      { to: '/vocabulaire', label: 'Vocabulaire', icon: '🔤', badge: 8 },
      { to: '/lecture', label: 'Lecture', icon: '📚', badge: 9 },
      { to: '/nourriture', label: 'Nourriture', icon: '🍽️', badge: 10 },
      { to: '/repertoire', label: 'Répertoire', icon: '👥', badge: 11 },
    ],
  },
]

const ALL_ITEMS = GROUPS.flatMap((g) => g.items)

export default function Layout({ onLogout }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">Maison.</span>
      </header>

      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">M</div>
          <div>
            <div className="sidebar-brand-name">Maison.</div>
            <div className="sidebar-brand-version">V. 2026</div>
          </div>
        </div>

        {GROUPS.map((group) => (
          <div className="sidebar-group" key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            <div className="sidebar-nav">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="nav-dot" />
                  <span>{item.label}</span>
                  <span className="nav-badge">{item.badge}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="sidebar-footer-avatar">M</div>
          <div>
            <div className="sidebar-footer-name">Mohamed</div>
            <div className="sidebar-footer-meta">Dakar · 168h/sem</div>
          </div>
          <button type="button" className="sidebar-logout" onClick={onLogout} aria-label="Se déconnecter">⏻</button>
        </div>
      </nav>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {ALL_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
