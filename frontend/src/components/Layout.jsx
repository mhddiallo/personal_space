import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

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

// Pages les plus utilisées, épinglées dans la barre du bas sur téléphone.
const PRIMARY_PATHS = ['/', '/objectifs', '/todo', '/journal']
const PRIMARY_ITEMS = PRIMARY_PATHS.map((to) => ALL_ITEMS.find((i) => i.to === to))

function NavGroups() {
  return GROUPS.map((group) => (
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
  ))
}

function UserFooter({ onLogout }) {
  return (
    <div className="sidebar-footer">
      <div className="sidebar-footer-avatar">M</div>
      <div>
        <div className="sidebar-footer-name">Mohamed</div>
        <div className="sidebar-footer-meta">Dakar · 168h/sem</div>
      </div>
      <button type="button" className="sidebar-logout" onClick={onLogout} aria-label="Se déconnecter">⏻</button>
    </div>
  )
}

export default function Layout({ onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Referme le panneau à chaque changement de page.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Bloque le défilement de la page derrière le panneau, et ferme avec Échap.
  useEffect(() => {
    if (!menuOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const onPrimaryPage = PRIMARY_PATHS.includes(pathname)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-brand-mark">M</div>
          <span className="brand">Maison.</span>
        </div>
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
      </header>

      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">M</div>
          <div>
            <div className="sidebar-brand-name">Maison.</div>
            <div className="sidebar-brand-version">V. 2026</div>
          </div>
        </div>
        <NavGroups />
        <UserFooter onLogout={onLogout} />
      </nav>

      <div className={`drawer-backdrop${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`mobile-drawer${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <div className="drawer-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-mark">M</div>
            <div>
              <div className="sidebar-brand-name">Maison.</div>
              <div className="sidebar-brand-version">V. 2026</div>
            </div>
          </div>
          <button type="button" className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">
            ✕
          </button>
        </div>
        <NavGroups />
        <UserFooter onLogout={onLogout} />
      </aside>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {PRIMARY_ITEMS.map((item) => (
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
        <button
          type="button"
          className={`bottom-nav-link${onPrimaryPage ? '' : ' active'}`}
          onClick={() => setMenuOpen(true)}
        >
          <span className="nav-icon">☰</span>
          <span>Menu</span>
        </button>
      </nav>
    </div>
  )
}
