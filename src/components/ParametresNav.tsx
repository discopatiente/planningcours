import { NavLink } from 'react-router-dom'

function ParametresNav() {
  return (
    <nav className="parametres-nav">
      <div className="parametres-nav-title">Année scolaire</div>
      <NavLink to="/parametres/emploi-du-temps">Emploi du temps</NavLink>
      <NavLink to="/parametres/calendrier">Calendrier</NavLink>
      <NavLink to="/parametres/evaluations">Évaluations</NavLink>
      <div className="parametres-nav-title">Général</div>
      <NavLink to="/parametres/matieres">Matières</NavLink>
      <NavLink to="/parametres/export">Export</NavLink>
    </nav>
  )
}

export default ParametresNav
