import { Outlet } from 'react-router-dom'
import ParametresNav from '../components/ParametresNav'

function Parametres() {
  return (
    <div className="parametres-layout">
      <ParametresNav />
      <div className="parametres-content">
        <Outlet />
      </div>
    </div>
  )
}

export default Parametres
