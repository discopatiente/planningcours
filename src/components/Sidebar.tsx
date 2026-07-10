import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { signOut } from '../lib/auth'

const CLE_STOCKAGE = 'sidebar-reduite'

function Sidebar() {
  const [reduite, setReduite] = useState(() => localStorage.getItem(CLE_STOCKAGE) === 'true')

  function toggle() {
    const suivant = !reduite
    setReduite(suivant)
    localStorage.setItem(CLE_STOCKAGE, String(suivant))
  }

  return (
    <nav className={`sidebar${reduite ? ' sidebar-reduite' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggle}
        aria-label={reduite ? 'Ouvrir la navigation' : 'Réduire la navigation'}
        title={reduite ? 'Ouvrir la navigation' : 'Réduire la navigation'}
      >
        {reduite ? '»' : '«'}
      </button>
      {!reduite && (
        <>
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
        </>
      )}
    </nav>
  )
}

export default Sidebar
