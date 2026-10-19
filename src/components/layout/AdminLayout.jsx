import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Users, FolderOpen, Package, Barcode, ShieldAlert, LogOut, Kanban, CalendarDays, HardHat, ArrowRightLeft, PenTool, Menu, X, ChevronDown, ChevronRight } from 'lucide-react'

export function AdminLayout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState({})
  
  const toggleMenu = (label, defaultState) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: prev[label] !== undefined ? !prev[label] : !defaultState
    }))
  }

  const navItems = [
    { path: '/admin/clientes', icon: Users, label: 'Clientes' },
    { path: '/admin/projetos', icon: FolderOpen, label: 'Projetos' },
    { path: '/admin/kanban', icon: Kanban, label: 'Kanban' },
    { path: '/admin/reunioes', icon: CalendarDays, label: 'Reuniões' },
    { 
      label: 'Técnicos', 
      icon: HardHat, 
      subItems: [
        { path: '/admin/tecnicos', label: 'Gestão de Técnicos' },
        { path: '/admin/tipos-ferramentas', label: 'Tipos de Ferramenta' },
        { path: '/admin/ferramentas', label: 'Estoque Ferramentas' },
        { path: '/admin/atribuicao-ferramentas', label: 'Atribuições' }
      ]
    },
    { path: '/admin/produtos', icon: Package, label: 'Produtos' },
    { path: '/admin/alocacoes', icon: ArrowRightLeft, label: 'Alocações' },
    { path: '/admin/auditoria', icon: ShieldAlert, label: 'Auditoria' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col md:flex-row text-slate-300">
      
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#111827] border-b border-[#1e3a5f]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
            <FolderOpen size={18} />
          </div>
          <span className="font-black text-white">WMS Admin</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-slate-300 hover:text-white p-1"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static top-0 left-0 h-full z-50
        w-64 bg-[#111827] border-r border-[#1e3a5f] flex flex-col
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-[#1e3a5f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <FolderOpen size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-none">WMS Admin</h1>
              <p className="text-xs text-slate-500 mt-1">Gestão de Cadastros</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            
            if (item.subItems) {
              const isAnyActive = item.subItems.some(sub => location.pathname.includes(sub.path))
              const isExpanded = expandedMenus[item.label] !== undefined ? expandedMenus[item.label] : isAnyActive
              
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.label, isAnyActive)}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all
                      ${isAnyActive 
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                        : 'text-slate-400 hover:bg-[#1e3a5f]/30 hover:text-white'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      {item.label}
                    </div>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  
                  {isExpanded && (
                    <div className="pl-11 pr-2 space-y-1 mt-1">
                      {item.subItems.map(sub => {
                        const isSubActive = location.pathname.includes(sub.path)
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`
                              block px-4 py-2 rounded-lg text-sm font-semibold transition-all
                              ${isSubActive
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e3a5f]/20'}
                            `}
                          >
                            {sub.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const isActive = location.pathname.includes(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                  ${isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                    : 'text-slate-400 hover:bg-[#1e3a5f]/30 hover:text-white'}
                `}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-[#1e3a5f] space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-[#1e3a5f]/30 hover:text-white transition-all"
          >
            <Barcode size={18} />
            Scanner
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
