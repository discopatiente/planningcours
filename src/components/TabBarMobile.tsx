import { NavLink } from 'react-router-dom'

function TabBarMobile() {
  return (
    <nav className="tabbar-mobile">
      <NavLink to="/jour">Jour</NavLink>
      <NavLink to="/semaine">Semaine</NavLink>
      <NavLink to="/impressions">Alertes</NavLink>
      <NavLink to="/unites-de-cours">Référentiel</NavLink>
    </nav>
  )
}

export default TabBarMobile
