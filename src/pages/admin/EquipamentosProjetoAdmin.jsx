import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Loader2, ArrowLeft, Trash2, UserCheck, X } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'

function EditablePatrimonio({ eq, onUpdate }) {
  const [value, setValue] = useState(eq.n_patrimonio || '')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (value === eq.n_patrimonio) {
      setIsEditing(false)
      return
    }
    
    setLoading(true)
    const { error } = await supabase
      .from('equipamentos')
      .update({ n_patrimonio: value })
      .eq('id', eq.id)
      
    setLoading(false)
    if (error) {
      alert('Erro ao salvar patrimônio: ' + error.message)
      setValue(eq.n_patrimonio || '')
    } else {
      onUpdate()
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        disabled={loading}
        className="w-full max-w-[120px] bg-[#111827] border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
        placeholder="Nº..."
      />
    )
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="cursor-pointer min-h-[28px] px-2 py-1 rounded hover:bg-[#1e3a5f]/50 transition-colors text-sm border border-transparent hover:border-[#1e3a5f] flex items-center"
      title="Clique para editar"
    >
      {eq.n_patrimonio ? (
        <span className="text-emerald-400 font-bold font-mono">{eq.n_patrimonio}</span>
      ) : (
        <span className="text-slate-500 italic text-xs">Adicionar...</span>
      )}
    </div>
  )
}

export function EquipamentosProjetoAdmin() {
  const { id } = useParams() // ID do projeto
  const [projeto, setProjeto] = useState(null)
  const [equipamentos, setEquipamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [alocacaoModal, setAlocacaoModal] = useState(null)

  async function fetchDados() {
    setLoading(true)
    
    // 1. Buscar detalhes do projeto e cliente
    const resProj = await supabase
      .from('projetos')
      .select('nome, clientes(nome)')
      .eq('id', id)
      .single()
      
    if (resProj.data) setProjeto(resProj.data)

    // 2. Buscar equipamentos vinculados
    const resEquip = await supabase
      .from('equipamentos')
      .select(`
        id, 
        ean, 
        sn, 
        n_patrimonio, 
        created_at, 
        produtos(nome),
        alocacao_equipamentos (
          id,
          data_alocacao,
          observacao,
          tecnicos(nome),
          tasks(titulo)
        )
      `)
      .eq('projeto_id', id)
      .order('created_at', { ascending: false })
      
    if (resEquip.data) setEquipamentos(resEquip.data)
    
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [id])

  async function handleDelete(idEquip) {
    if (!window.confirm('Excluir este equipamento? Ele não contará mais neste projeto.')) return
    await supabase.from('equipamentos').delete().eq('id', idEquip)
    fetchDados()
  }

  async function handleDeleteMany(ids) {
    const { error } = await supabase.from('equipamentos').delete().in('id', ids)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchDados()
  }



  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          to="/admin/projetos"
          className="p-3 bg-[#111827] hover:bg-[#1e3a5f]/50 border border-[#1e3a5f] rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white">
            {projeto ? projeto.nome : 'Carregando projeto...'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cliente: {projeto?.clientes?.nome || '...'}
          </p>
        </div>
      </div>

      {/* Tabela via DataTable */}
      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex justify-center gap-2">
            <Loader2 className="animate-spin" /> Carregando equipamentos...
          </div>
        ) : (
          <DataTable
            data={equipamentos}
            searchKeys={['ean', 'sn', 'n_patrimonio', 'produtos.nome']}
            dateKey="created_at"
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum equipamento bipado para este projeto."
            rowClassName={(eq) => eq.alocacao_equipamentos?.length > 0 ? 'bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-[#1e3a5f]/10'}
            columns={[
              { 
                key: 'created_at', 
                label: 'Data/Hora', 
                tdClassName: 'text-sm text-slate-400 tabular-nums',
                render: (eq) => new Date(eq.created_at).toLocaleString() 
              },
              { key: 'ean', label: 'EAN', tdClassName: 'font-mono text-sm text-slate-400' },
              { key: 'produto', label: 'Produto', render: (eq) => <span className="font-semibold text-white">{eq.produtos?.nome || 'Desconhecido'}</span> },
              { key: 'sn', label: 'S/N', render: (eq) => <span className="font-mono font-bold text-blue-400 tracking-wide">{eq.sn}</span> },
              { key: 'n_patrimonio', label: 'Nº Patrimônio', render: (eq) => <EditablePatrimonio eq={eq} onUpdate={fetchDados} /> },
              {
                key: 'actions',
                label: 'Ações',
                tdClassName: 'text-right',
                render: (eq) => (
                  <div className="flex items-center justify-end gap-2">
                    {eq.alocacao_equipamentos?.length > 0 && (
                      <button 
                        onClick={() => setAlocacaoModal(eq)} 
                        className="p-2 text-red-400 hover:text-red-300 transition-colors bg-[#0f172a] rounded-lg border border-red-500/30 hover:border-red-500/50"
                        title="Ver Histórico de Retirada"
                      >
                        <UserCheck size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(eq.id)} 
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30"
                      title="Excluir bipe"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              }
            ]}
          />
        )}
      </div>

      {/* Modal Histórico de Alocação */}
      {alocacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#1e3a5f]">
              <div>
                <h3 className="text-xl font-bold text-white">Histórico de Retirada</h3>
                <p className="text-sm text-slate-400 mt-1">S/N: <span className="font-mono text-blue-400">{alocacaoModal.sn}</span></p>
              </div>
              <button 
                onClick={() => setAlocacaoModal(null)}
                className="text-slate-500 hover:text-white p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {alocacaoModal.alocacao_equipamentos?.map((aloc, idx) => (
                <div key={aloc.id || idx} className="bg-[#0f172a] p-4 rounded-xl border border-[#1e3a5f]/50 relative">
                  <div className="absolute top-4 right-4 text-xs font-medium text-slate-500 tabular-nums">
                    {new Date(aloc.data_alocacao).toLocaleString()}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Técnico</span>
                      <p className="text-red-400 font-semibold">{aloc.tecnicos?.nome || 'N/A'}</p>
                    </div>
                    
                    {aloc.tasks?.titulo && (
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tarefa / Projeto</span>
                        <p className="text-white text-sm">{aloc.tasks.titulo}</p>
                      </div>
                    )}
                    
                    {aloc.observacao && (
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observação</span>
                        <p className="text-slate-300 text-sm italic">"{aloc.observacao}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
