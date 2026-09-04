import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, FolderOpen, Loader2 } from 'lucide-react'

/**
 * Tela de setup: seleciona Cliente e Projeto antes de iniciar a bipagem.
 */
export function SetupScreen({ onStart }) {
  const [clientes, setClientes] = useState([])
  const [projetos, setProjetos] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [projetoId, setProjetoId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const projectRef = useRef(null)

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => {
        setClientes(data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!clienteId) { setProjetos([]); setProjetoId(''); return }
    setLoadingProjects(true)
    supabase
      .from('projetos')
      .select('id, nome')
      .eq('cliente_id', clienteId)
      .order('nome')
      .then(({ data }) => {
        setProjetos(data ?? [])
        setProjetoId('')
        setLoadingProjects(false)
        setTimeout(() => projectRef.current?.focus(), 50)
      })
  }, [clienteId])

  const clienteNome = clientes.find(c => c.id === clienteId)?.nome ?? ''
  const projetoNome = projetos.find(p => p.id === projetoId)?.nome ?? ''
  const canStart = clienteId && projetoId

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] p-6">
      <div className="w-full max-w-lg">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
              <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/>
              <path d="M12 3v18M3 7l9 4 9-4"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">WMS Scanner</h1>
          <p className="text-slate-400 mt-1 text-sm">Entrada de Equipamentos de Infraestrutura</p>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-6">Configurar Sessão</h2>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin" /> Carregando clientes...
            </div>
          ) : (
            <div className="space-y-5">
              {/* Cliente */}
              <div>
                <label htmlFor="select-cliente" className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                  <Users size={14} className="text-blue-400" /> Cliente
                </label>
                <select
                  id="select-cliente"
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f]
                    text-white text-sm font-medium
                    focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30
                    transition-all cursor-pointer
                  "
                >
                  <option value="">— Selecione o cliente —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Projeto */}
              <div>
                <label htmlFor="select-projeto" className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                  <FolderOpen size={14} className="text-blue-400" /> Projeto
                </label>
                <div className="relative">
                  <select
                    id="select-projeto"
                    ref={projectRef}
                    value={projetoId}
                    onChange={e => setProjetoId(e.target.value)}
                    disabled={!clienteId || loadingProjects}
                    className="
                      w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f]
                      text-white text-sm font-medium
                      focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all cursor-pointer
                    "
                  >
                    <option value="">— Selecione o projeto —</option>
                    {projetos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  {loadingProjects && (
                    <Loader2 size={16} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Summary */}
              {canStart && (
                <div className="px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-800/40 text-sm">
                  <p className="text-slate-400">Sessão:</p>
                  <p className="font-bold text-white mt-0.5">{clienteNome} <span className="text-blue-400 mx-1">›</span> {projetoNome}</p>
                </div>
              )}

              {/* Button */}
              <button
                id="btn-iniciar-sessao"
                onClick={() => canStart && onStart({ clienteId, clienteNome, projetoId, projetoNome })}
                disabled={!canStart}
                className="
                  w-full py-4 rounded-xl font-bold text-base tracking-wide
                  bg-blue-600 text-white hover:bg-blue-500
                  disabled:opacity-30 disabled:cursor-not-allowed
                  transition-all duration-200 active:scale-[0.98]
                  shadow-lg shadow-blue-600/20
                "
              >
                Iniciar Bipagem →
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 px-2">
          <p className="text-xs text-slate-600">
            Supabase · React · Vite — v1.0
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs font-semibold text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            Sair
          </button>
          <a
            href="/admin"
            className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            Painel Administrativo →
          </a>
        </div>
      </div>
    </div>
  )
}
