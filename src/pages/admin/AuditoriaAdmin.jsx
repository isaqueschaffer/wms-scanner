import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Loader2, Database, ShieldAlert, Activity, Eye, FileJson } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'

const TABLE_NAMES = {
  clientes: 'Clientes',
  projetos: 'Projetos',
  produtos: 'Produtos',
  equipamentos: 'Equipamentos',
  tecnicos: 'Técnicos',
  reunioes: 'Reuniões',
  etapas: 'Etapas',
  tasks: 'Tarefas',
  alocacao_equipamentos: 'Alocações',
  ferramentas: 'Ferramentas'
}

export function AuditoriaAdmin() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  function openDetails(log) {
    setSelectedLog(log)
    setModalOpen(true)
  }

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
            <ShieldAlert className="text-emerald-400" aria-hidden="true" />
            Auditoria de Sistema
          </h1>
          <p className="text-slate-400 mt-2">
            Registro imutável de todas as ações realizadas no banco de dados.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex justify-center gap-2 font-semibold">
            <Loader2 className="animate-spin" aria-hidden="true" /> Carregando logs de auditoria…
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
                render: (log) => new Date(log.criado_em).toLocaleString('pt-BR')
              },
              { 
                key: 'usuario_email', 
                label: 'Usuário', 
                tdClassName: 'text-sm font-semibold text-white',
                render: (log) => log.usuario_email || <span className="text-slate-400 italic">Desconhecido</span>
              },
              { 
                key: 'acao', 
                label: 'Ação', 
                render: (log) => (
                  <span className={`px-2 py-1 rounded text-xs font-bold tracking-wider
                    ${log.acao === 'INSERT' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      log.acao === 'UPDATE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      log.acao === 'DELETE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-500/20 text-slate-400'}
                  `}>
                    {log.acao}
                  </span>
                )
              },
              { 
                key: 'tabela', 
                label: 'Tabela', 
                tdClassName: 'text-sm text-slate-300 font-medium',
                render: (log) => (
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-slate-400" aria-hidden="true" />
                    {TABLE_NAMES[log.tabela] || log.tabela}
                  </div>
                )
              },
              { 
                key: 'registro_id', 
                label: 'ID Afetado', 
                tdClassName: 'font-mono text-xs text-slate-400 break-all max-w-[150px]'
              },
              {
                key: 'actions',
                label: 'Ações',
                tdClassName: 'text-right',
                render: (log) => (
                  <button 
                    onClick={() => openDetails(log)} 
                    className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30" 
                    title="Ver Detalhes" aria-label="Ver Detalhes"
                  >
                    <Eye size={16} aria-hidden="true" />
                  </button>
                )
              }
            ]}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Detalhes da Auditoria">
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-[#0f172a] p-4 rounded-xl border border-[#1e3a5f]/50">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Ação Realizada</span>
                <span className={`px-2 py-1 rounded text-xs font-bold tracking-wider inline-block
                  ${selectedLog.acao === 'INSERT' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    selectedLog.acao === 'UPDATE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    selectedLog.acao === 'DELETE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-500/20 text-slate-400'}
                `}>
                  {selectedLog.acao}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Tabela</span>
                <span className="text-sm font-semibold text-white">{TABLE_NAMES[selectedLog.tabela] || selectedLog.tabela}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Usuário</span>
                <span className="text-sm text-slate-300">{selectedLog.usuario_email || 'Desconhecido'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Data/Hora</span>
                <span className="text-sm text-slate-300 tabular-nums">{new Date(selectedLog.criado_em).toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileJson size={16} className="text-blue-500" aria-hidden="true" /> Detalhes dos Dados
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedLog.acao === 'UPDATE' || selectedLog.acao === 'DELETE') && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">Dados Antigos</span>
                    <pre className="bg-[#0a0e1a] border border-red-900/30 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(selectedLog.dados_anteriores, null, 2)}
                    </pre>
                  </div>
                )}
                
                {(selectedLog.acao === 'UPDATE' || selectedLog.acao === 'INSERT') && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-green-400 uppercase tracking-wider block">Dados Novos</span>
                    <pre className="bg-[#0a0e1a] border border-green-900/30 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(selectedLog.dados_novos, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t border-[#1e3a5f] flex justify-end">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
