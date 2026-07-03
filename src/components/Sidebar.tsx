import { NavLink } from 'react-router-dom'
import { signOut } from '../lib/auth'

function Sidebar() {
  return (
    <nav className="sidebar">
      <NavLink to="/semaine">Semaine</NavLink>
      <NavLink to="/gantt">Gantt</NavLink>
      <NavLink to="/referentiel">Référentiel</NavLink>
      <NavLink to="/parametres">Paramètres</NavLink>
      <button type="button" className="sidebar-signout" onClick={() => signOut()}>
        Se déconnecter
      </button>
    </nav>
  )
}

export default Sidebar
