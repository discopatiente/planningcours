import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthProvider from './components/AuthProvider'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Semaine from './pages/Semaine'
import Impressions from './pages/Impressions'
import Gantt from './pages/Gantt'
import Chapitres from './pages/Chapitres'
import UnitesDeCours from './pages/UnitesDeCours'
import Progressions from './pages/Progressions'
import Eleves from './pages/Eleves'
import Parametres from './pages/Parametres'
import EmploiDuTemps from './pages/parametres/EmploiDuTemps'
import Calendrier from './pages/parametres/Calendrier'
import Evaluations from './pages/parametres/Evaluations'
import Matieres from './pages/parametres/Matieres'
import Export from './pages/parametres/Export'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/semaine" replace />} />
          <Route path="/semaine" element={<Semaine />} />
          <Route path="/impressions" element={<Impressions />} />
          <Route path="/gantt" element={<Gantt />} />
          <Route path="/chapitres" element={<Chapitres />} />
          <Route path="/unites-de-cours" element={<UnitesDeCours />} />
          <Route path="/progressions" element={<Progressions />} />
          <Route path="/eleves" element={<Eleves />} />
          <Route path="/parametres" element={<Parametres />}>
            <Route index element={<Navigate to="/parametres/matieres" replace />} />
            <Route path="emploi-du-temps" element={<EmploiDuTemps />} />
            <Route path="calendrier" element={<Calendrier />} />
            <Route path="evaluations" element={<Evaluations />} />
            <Route path="matieres" element={<Matieres />} />
            <Route path="export" element={<Export />} />
          </Route>
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
