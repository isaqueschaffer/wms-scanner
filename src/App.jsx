import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'

import { SetupScreen } from './components/SetupScreen'
import { Scanner } from './components/Scanner'
import { AdminLayout } from './components/AdminLayout'
import { ClientesAdmin } from './pages/ClientesAdmin'
import { ProjetosAdmin } from './pages/ProjetosAdmin'
import { ProdutosAdmin } from './pages/ProdutosAdmin'
import { EquipamentosProjetoAdmin } from './pages/EquipamentosProjetoAdmin'
import { AuditoriaAdmin } from './pages/AuditoriaAdmin'

function ScannerApp() {
  const [session, setSession] = useState(null)
  return session 
    ? <Scanner session={session} onReset={() => setSession(null)} />
    : <SetupScreen onStart={setSession} />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública */}
          <Route path="/login" element={<Login />} />

          {/* Rotas Protegidas */}
          <Route path="/" element={<ProtectedRoute><ScannerApp /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/clientes" replace />} />
            <Route path="clientes" element={<ClientesAdmin />} />
            <Route path="projetos" element={<ProjetosAdmin />} />
            <Route path="projetos/:id" element={<EquipamentosProjetoAdmin />} />
            <Route path="produtos" element={<ProdutosAdmin />} />
            <Route path="auditoria" element={<AuditoriaAdmin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
