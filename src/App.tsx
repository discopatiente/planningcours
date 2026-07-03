import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthProvider from './components/AuthProvider'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Semaine from './pages/Semaine'
import Gantt from './pages/Gantt'
import Referentiel from './pages/Referentiel'
import Parametres from './pages/Parametres'

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
          <Route path="/gantt" element={<Gantt />} />
          <Route path="/referentiel" element={<Referentiel />} />
          <Route path="/parametres" element={<Parametres />} />
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
