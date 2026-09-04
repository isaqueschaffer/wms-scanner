import { Link, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Users, FolderOpen, Package, Barcode, ShieldAlert, LogOut } from 'lucide-react'

export function AdminLayout() {
  const location = useLocation()
  
  const navItems = [
    { path: '/admin/clientes', icon: Users, label: 'Clientes' },
    { path: '/admin/projetos', icon: FolderOpen, label: 'Projetos' },
    { path: '/admin/produtos', icon: Package, label: 'Produtos' },
    { path: '/admin/auditoria', icon: ShieldAlert, label: 'Auditoria' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex text-slate-300">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111827] border-r border-[#1e3a5f] flex flex-col">
        <div className="p-6 border-b border-[#1e3a5f]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <FolderOpen size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-none">WMS Admin</h1>
              <p className="text-xs text-slate-500 mt-1">Gestão de Cadastros</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.includes(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
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
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
