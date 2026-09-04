import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Loader2, Database, ShieldAlert, Activity } from 'lucide-react'
import { DataTable } from '../components/DataTable'

export function AuditoriaAdmin() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from('logs_auditoria')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(1000)

      if (data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-emerald-400" />
            Auditoria de Sistema
          </h1>
          <p className="text-slate-400 mt-2">
            Registro imutável de todas as ações realizadas no banco de dados.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex justify-center gap-2 font-semibold">
            <Loader2 className="animate-spin" /> Carregando logs de auditoria...
          </div>
        ) : (
          <DataTable
            data={logs}
            searchKeys={['usuario_email', 'tabela', 'acao', 'registro_id']}
            dateKey="criado_em"
            emptyMessage="Nenhum registro de auditoria encontrado."
            columns={[
              { 
                key: 'criado_em', 
                label: 'Data/Hora', 
                tdClassName: 'text-sm text-slate-400 tabular-nums',
                render: (log) => new Date(log.criado_em).toLocaleString()
              },
              { 
                key: 'usuario_email', 
                label: 'Usuário', 
                tdClassName: 'text-sm font-semibold text-white',
                render: (log) => log.usuario_email || <span className="text-slate-600 italic">Desconhecido</span>
              },
              { 
                key: 'acao', 
                label: 'Ação', 
                render: (log) => (
                  <span className={`px-2 py-1 rounded text-xs font-bold tracking-wider
                    ${log.acao === 'INSERT' ? 'bg-green-500/20 text-green-400' :
                      log.acao === 'UPDATE' ? 'bg-blue-500/20 text-blue-400' :
                      log.acao === 'DELETE' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}
                  `}>
                    {log.acao}
                  </span>
                )
              },
              { 
                key: 'tabela', 
                label: 'Tabela', 
                tdClassName: 'text-sm text-slate-300 capitalize',
                render: (log) => (
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-slate-500" />
                    {log.tabela}
                  </div>
                )
              },
              { 
                key: 'registro_id', 
                label: 'ID Afetado', 
                tdClassName: 'font-mono text-xs text-slate-500 break-all max-w-[200px]'
              }
            ]}
          />
        )}
      </div>
    </div>
  )
}
