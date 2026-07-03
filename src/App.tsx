import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Semaine from './pages/Semaine'
import Gantt from './pages/Gantt'
import Referentiel from './pages/Referentiel'
import Parametres from './pages/Parametres'

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/semaine" replace />} />
            <Route path="/semaine" element={<Semaine />} />
            <Route path="/gantt" element={<Gantt />} />
            <Route path="/referentiel" element={<Referentiel />} />
            <Route path="/parametres" element={<Parametres />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
