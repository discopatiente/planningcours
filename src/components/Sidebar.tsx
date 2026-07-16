import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react'
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
        {reduite ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>
      {!reduite && (
        <>
          <div className="sidebar-groupe-titre">Consulter</div>
          <NavLink to="/semaine">Semaine</NavLink>
          <NavLink to="/devoirs">Liste des devoirs</NavLink>
          <NavLink to="/impressions">Impressions</NavLink>
          <NavLink to="/eleves">Élèves</NavLink>
          <NavLink to="/avancement">Où j'en suis</NavLink>

          <div className="sidebar-groupe-titre">Construire</div>
          <NavLink to="/unites-de-cours">Unités de cours</NavLink>
          <NavLink to="/banque-devoirs">Banque de devoirs</NavLink>
          <NavLink to="/chapitres">Chapitres</NavLink>
          <NavLink to="/progressions">Progressions</NavLink>

          <div className="sidebar-groupe-titre">Régler</div>
          <NavLink to="/parametres">Paramètres</NavLink>

          <button type="button" className="sidebar-signout" onClick={() => signOut()}>
            <LogOut size={14} />
            Se déconnecter
          </button>
        </>
      )}
    </nav>
  )
}

export default Sidebar
