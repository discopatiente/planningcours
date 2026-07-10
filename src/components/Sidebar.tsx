import { NavLink } from 'react-router-dom'
import { signOut } from '../lib/auth'

function Sidebar() {
  return (
    <nav className="sidebar">
      <NavLink to="/semaine">Semaine</NavLink>
      <NavLink to="/impressions">Impressions</NavLink>
      <NavLink to="/gantt">Gantt</NavLink>
      <NavLink to="/chapitres">Chapitres</NavLink>
      <NavLink to="/unites-de-cours">Unités de cours</NavLink>
      <NavLink to="/progressions">Progressions</NavLink>
      <NavLink to="/eleves">Élèves</NavLink>
      <NavLink to="/parametres">Paramètres</NavLink>
      <button type="button" className="sidebar-signout" onClick={() => signOut()}>
        Se déconnecter
      </button>
    </nav>
  )
}

export default Sidebar
