import { NavLink } from 'react-router-dom'

function Sidebar() {
  return (
    <nav className="sidebar">
      <NavLink to="/semaine">Semaine</NavLink>
      <NavLink to="/gantt">Gantt</NavLink>
      <NavLink to="/referentiel">Référentiel</NavLink>
      <NavLink to="/parametres">Paramètres</NavLink>
    </nav>
  )
}

export default Sidebar
