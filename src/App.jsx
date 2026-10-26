import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import './index.css'

import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Login } from './pages/Login'
import { AdminLayout } from './components/layout/AdminLayout'
import { NotFound } from './pages/NotFound'
import { useDocumentTitle } from './hooks/useDocumentTitle'

// Cada tela vira um arquivo separado, baixado só quando a rota é aberta
const pagina = (carregar, nome) => lazy(() => carregar().then(m => ({ default: m[nome] })))

const SetupScreen = pagina(() => import('./components/scanner/SetupScreen'), 'SetupScreen')
const Scanner = pagina(() => import('./components/scanner/Scanner'), 'Scanner')
const RetiradaScanner = pagina(() => import('./components/scanner/RetiradaScanner'), 'RetiradaScanner')
const ClientesAdmin = pagina(() => import('./pages/admin/ClientesAdmin'), 'ClientesAdmin')
const ProjetosAdmin = pagina(() => import('./pages/admin/ProjetosAdmin'), 'ProjetosAdmin')
const ProdutosAdmin = pagina(() => import('./pages/admin/ProdutosAdmin'), 'ProdutosAdmin')
const EquipamentosProjetoAdmin = pagina(() => import('./pages/admin/EquipamentosProjetoAdmin'), 'EquipamentosProjetoAdmin')
const AuditoriaAdmin = pagina(() => import('./pages/admin/AuditoriaAdmin'), 'AuditoriaAdmin')
const TecnicosAdmin = pagina(() => import('./pages/admin/TecnicosAdmin'), 'TecnicosAdmin')
const ProjetoKanban = pagina(() => import('./pages/admin/ProjetoKanban'), 'ProjetoKanban')
const ReunioesAdmin = pagina(() => import('./pages/admin/ReunioesAdmin'), 'ReunioesAdmin')
const AlocacaoEquipamentosAdmin = pagina(() => import('./pages/admin/AlocacaoEquipamentosAdmin'), 'AlocacaoEquipamentosAdmin')
const FerramentasAdmin = pagina(() => import('./pages/admin/FerramentasAdmin'), 'FerramentasAdmin')
const AtribuicaoFerramentasAdmin = pagina(() => import('./pages/admin/AtribuicaoFerramentasAdmin'), 'AtribuicaoFerramentasAdmin')
const TiposFerramentasAdmin = pagina(() => import('./pages/admin/TiposFerramentasAdmin'), 'TiposFerramentasAdmin')

function Carregando() {
  return (
    <div role="status" className="min-h-screen bg-[#0a0e1a] flex items-center justify-center gap-2 text-slate-400">
      <Loader2 className="animate-spin" aria-hidden="true" /> Carregando…
    </div>
  )
}

function ScannerApp() {
  const [session, setSession] = useState(null)
  useDocumentTitle(session ? 'Bipagem' : 'Scanner')
  return session
    ? <Scanner session={session} onReset={() => setSession(null)} />
    : <SetupScreen onStart={setSession} />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Carregando />}>
          <Routes>
            {/* Rota Pública */}
            <Route path="/login" element={<Login />} />

            {/* Rotas Protegidas */}
            <Route path="/" element={<ProtectedRoute><ScannerApp /></ProtectedRoute>} />

            <Route path="/retirar/:id" element={<ProtectedRoute><RetiradaScanner /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/clientes" replace />} />
              <Route path="clientes" element={<ClientesAdmin />} />
              <Route path="projetos" element={<ProjetosAdmin />} />
              <Route path="projetos/:id" element={<EquipamentosProjetoAdmin />} />
              <Route path="kanban" element={<ProjetoKanban />} />
              <Route path="reunioes" element={<ReunioesAdmin />} />
              <Route path="tecnicos" element={<TecnicosAdmin />} />
              <Route path="tipos-ferramentas" element={<TiposFerramentasAdmin />} />
              <Route path="produtos" element={<ProdutosAdmin />} />
              <Route path="alocacoes" element={<AlocacaoEquipamentosAdmin />} />
              <Route path="ferramentas" element={<FerramentasAdmin />} />
              <Route path="atribuicao-ferramentas" element={<AtribuicaoFerramentasAdmin />} />
              <Route path="auditoria" element={<AuditoriaAdmin />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
