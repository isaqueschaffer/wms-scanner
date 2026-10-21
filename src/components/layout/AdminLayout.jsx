import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { Users, FolderOpen, Package, Barcode, ShieldAlert, LogOut, Kanban, CalendarDays, HardHat, ArrowRightLeft, Wrench, Tags, ClipboardList, Menu, X, Loader2 } from 'lucide-react'

const NAV_GROUPS = [
  {
    titulo: 'Cadastros',
    items: [
      { path: '/admin/clientes', icon: Users, label: 'Clientes' },
      { path: '/admin/projetos', icon: FolderOpen, label: 'Projetos' },
      { path: '/admin/produtos', icon: Package, label: 'Produtos' },
    ],
  },
  {
    titulo: 'Operação',
    items: [
      { path: '/admin/alocacoes', icon: ArrowRightLeft, label: 'Alocações' },
      { path: '/admin/kanban', icon: Kanban, label: 'Kanban' },
      { path: '/admin/reunioes', icon: CalendarDays, label: 'Reuniões' },
    ],
  },
  {
    titulo: 'Equipe e ferramentas',
    items: [
      { path: '/admin/tecnicos', icon: HardHat, label: 'Técnicos' },
      { path: '/admin/tipos-ferramentas', icon: Tags, label: 'Tipos de Ferramenta' },
      { path: '/admin/ferramentas', icon: Wrench, label: 'Estoque de Ferramentas' },
      { path: '/admin/atribuicao-ferramentas', icon: ClipboardList, label: 'Atribuições' },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      { path: '/admin/auditoria', icon: ShieldAlert, label: 'Auditoria' },
    ],
  },
]

const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

const estaAtivo = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`)

const linkClass = (ativo) => `
  flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
  ${ativo
    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
    : 'text-slate-400 border border-transparent hover:bg-[#1e3a5f]/30 hover:text-white'}
`

export function AdminLayout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // A página de um projeto define o próprio título (nome do projeto)
  const ehDetalheDeProjeto = /^\/admin\/projetos\/[^/]+/.test(location.pathname)
  const itemAtual = NAV_ITEMS.find(i => estaAtivo(location.pathname, i.path))
  useDocumentTitle(ehDetalheDeProjeto ? null : itemAtual?.label)

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const onKeyDown = (e) => e.key === 'Escape' && setIsMobileMenuOpen(false)
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMobileMenuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col md:flex-row text-slate-300">

      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white focus:font-bold"
      >
        Pular para o conteúdo
      </a>

      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#111827] border-b border-[#1e3a5f]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
            <FolderOpen size={18} aria-hidden="true" />
          </div>
          <span className="font-black text-white">WMS Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="menu-lateral"
          className="text-slate-300 hover:text-white p-2 -mr-2 rounded-lg"
        >
          <Menu size={24} aria-hidden="true" />
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="menu-lateral"
        className={`
          fixed md:static top-0 left-0 h-full z-50
          w-64 bg-[#111827] border-r border-[#1e3a5f] flex flex-col
          transition-[transform,visibility] duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0 visible' : '-translate-x-full max-md:invisible md:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-[#1e3a5f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <FolderOpen size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none">WMS Admin</p>
              <p className="text-xs text-slate-400 mt-1">Gestão de Cadastros</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Fechar menu"
            className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Menu principal" className="flex-1 p-4 space-y-5 overflow-y-auto overscroll-contain">
          {NAV_GROUPS.map((grupo, i) => (
            <div key={grupo.titulo} role="group" aria-labelledby={`nav-grupo-${i}`}>
              <p id={`nav-grupo-${i}`} className="px-4 mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {grupo.titulo}
              </p>
              <div className="space-y-1">
                {grupo.items.map(item => {
                  const Icon = item.icon
                  const ativo = estaAtivo(location.pathname, item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={ativo ? 'page' : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={linkClass(ativo)}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1e3a5f] space-y-1">
          <Link to="/" className={linkClass(false)}>
            <Barcode size={18} aria-hidden="true" />
            Ir para o Scanner
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-transparent hover:bg-red-500/20 hover:text-red-400 transition-all"
          >
            <LogOut size={18} aria-hidden="true" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="conteudo" tabIndex={-1} className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 outline-none">
        <Suspense
          fallback={
            <div role="status" className="p-8 text-center text-slate-400 flex justify-center gap-2">
              <Loader2 className="animate-spin" aria-hidden="true" /> Carregando…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
