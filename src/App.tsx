import type { ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { JoinPage } from './pages/JoinPage'
import { PlayPage } from './pages/PlayPage'

function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const shellClass = pathname === '/play' ? 'app-shell app-shell--play' : 'app-shell'

  return (
    <div className={shellClass}>
      <header className="top-nav">
        <Link to="/" className="brand">
          <span className="brand__pi">π</span>
          <span className="brand__txt">Pi Day Live</span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/" end>
            בית
          </NavLink>
          <NavLink to="/join">הצטרפות</NavLink>
          <NavLink to="/play">משחק</NavLink>
          <NavLink to="/admin">אדמין</NavLink>
        </nav>
      </header>
      <main className="main-area">{children}</main>
      <footer className="footer-note muted small">Vite · Netlify · Supabase Realtime</footer>
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Layout>
  )
}
