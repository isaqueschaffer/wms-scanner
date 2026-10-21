import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, ArrowRightLeft, Search, Edit, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'

function EditAlocacaoModal({ alocacao, tecnicos, onClose, onUpdate }) {
  const [tecnicoId, setTecnicoId] = useState(alocacao.tecnicos?.id || '')
  const [taskId, setTaskId] = useState(alocacao.tasks?.id || '')
  const [observacao, setObservacao] = useState(alocacao.observacao || '')
  const [projTasks, setProjTasks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchTasks() {
      const { data } = await supabase
        .from('tasks')
        .select('id, titulo')
        .eq('projeto_id', alocacao.equipamentos?.projetos?.id)
        .order('titulo')
      setProjTasks(data || [])
    }
    if (alocacao.equipamentos?.projetos?.id) fetchTasks()
  }, [alocacao])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase
      .from('alocacao_equipamentos')
      .update({
        tecnico_id: tecnicoId,
        task_id: taskId || null,
        observacao: observacao
      })
      .eq('id', alocacao.id)
    
    setLoading(false)
    if (error) {
      alert('Erro ao atualizar: ' + error.message)
    } else {
      onUpdate()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a5f]">
          <h3 className="text-xl font-bold text-white">Editar Alocação</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Equipamento / Projeto</label>
            <div className="p-3 bg-[#1e293b] rounded-lg border border-[#1e3a5f] text-slate-400 text-sm">
              <span className="text-white font-bold">{alocacao.equipamentos?.produtos?.nome}</span> (S/N: {alocacao.equipamentos?.sn}) <br/>
              Projeto: {alocacao.equipamentos?.projetos?.nome}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Técnico</label>
            <select
              value={tecnicoId}
              onChange={e => setTecnicoId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">-- Selecione --</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Tarefa</label>
            <select
              value={taskId}
              onChange={e => setTaskId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Nenhuma</option>
              {projTasks.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Observação</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              rows={3}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-slate-400 hover:text-white hover:bg-[#1e3a5f]/50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center">
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AlocacaoEquipamentosAdmin() {
  const [projetos, setProjetos] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  
  const [selectedProjeto, setSelectedProjeto] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [selectedTecnico, setSelectedTecnico] = useState('')
  const [tasks, setTasks] = useState([])
  
  const [sn, setSn] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  
  // Historico
  const [alocacoes, setAlocacoes] = useState([])
  const [loadingAlocacoes, setLoadingAlocacoes] = useState(false)
  const [editModal, setEditModal] = useState(null)
  
  const snInputRef = useRef(null)

  async function fetchAlocacoes() {
    setLoadingAlocacoes(true)
    const { data } = await supabase
      .from('alocacao_equipamentos')
      .select(`
        id, 
        data_alocacao, 
        observacao,
        equipamentos (id, sn, ean, produtos(nome), projetos(id, nome)),
        tecnicos (id, nome),
        tasks (id, titulo)
      `)
      .order('data_alocacao', { ascending: false })
      
    if (data) setAlocacoes(data)
    setLoadingAlocacoes(false)
  }

  useEffect(() => {
    async function init() {
      const [resProj, resTec] = await Promise.all([
        supabase.from('projetos').select('id, nome, clientes(nome)').order('nome'),
        supabase.from('tecnicos').select('id, nome').eq('ativo', true).order('nome')
      ])
      setProjetos(resProj.data || [])
      setTecnicos(resTec.data || [])
      fetchAlocacoes()
    }
    init()
  }, [])

  useEffect(() => {
    if (selectedProjeto) {
      supabase.from('tasks')
        .select('id, titulo')
        .eq('projeto_id', selectedProjeto)
        .order('titulo')
        .then(({ data }) => setTasks(data || []))
    } else {
      setTasks([])
    }
    setSelectedTask('')
  }, [selectedProjeto])

  async function handleAllocate(e) {
    e.preventDefault()
    if (!selectedProjeto || !selectedTecnico || !sn.trim()) {
      setMessage({ type: 'error', text: 'Preencha Projeto, Técnico e o Serial Number.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { data: equipData, error: equipError } = await supabase
        .from('equipamentos')
        .select('id, ean, produtos(nome)')
        .eq('projeto_id', selectedProjeto)
        .eq('sn', sn.trim())
        .single()

      if (equipError || !equipData) {
        throw new Error('Equipamento não encontrado neste projeto com este Serial Number.')
      }

      const { error: alocError } = await supabase
        .from('alocacao_equipamentos')
        .insert({
          equipamento_id: equipData.id,
          task_id: selectedTask || null,
          tecnico_id: selectedTecnico
        })

      if (alocError) throw alocError

      setMessage({ type: 'success', text: `Equipamento ${equipData.produtos?.nome || equipData.ean} alocado com sucesso!` })
      setSn('')
      snInputRef.current?.focus()
      fetchAlocacoes() // recarrega historico

    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAlocacao(id) {
    if (!window.confirm('Excluir este registro de alocação?')) return
    await supabase.from('alocacao_equipamentos').delete().eq('id', id)
    fetchAlocacoes()
  }
  
  async function handleDeleteManyAlocacoes(ids) {
    await supabase.from('alocacao_equipamentos').delete().in('id', ids)
    fetchAlocacoes()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Cabeçalho e Form */}
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ArrowRightLeft className="text-blue-500" />
            Alocação de Equipamentos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Registre a entrega de equipamentos para os técnicos em campo</p>
        </div>

        <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-2xl p-6 md:p-8 shadow-xl">
          <form onSubmit={handleAllocate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">1. Selecione o Projeto</label>
                <select
                  value={selectedProjeto}
                  onChange={e => setSelectedProjeto(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Escolha um Projeto --</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.clientes?.nome})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">2. Selecione o Técnico</label>
                <select
                  value={selectedTecnico}
                  onChange={e => setSelectedTecnico(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Escolha o Técnico --</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">3. Tarefa (Opcional)</label>
              <select
                value={selectedTask}
                onChange={e => setSelectedTask(e.target.value)}
                disabled={!selectedProjeto || tasks.length === 0}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Nenhuma / Não especificada</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">Você pode vincular esta saída de equipamento a uma task específica do Kanban.</p>
            </div>

            <div className="pt-4 border-t border-[#1e3a5f]">
              <label className="block text-sm font-semibold text-slate-300 mb-2">4. Bipar Equipamento (Serial Number)</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    ref={snInputRef}
                    type="text"
                    value={sn}
                    onChange={e => setSn(e.target.value)}
                    placeholder="Escaneie o código de barras ou digite o SN..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#1e293b] border-2 border-[#1e3a5f] focus:border-blue-500 text-white font-mono uppercase focus:outline-none transition-colors"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading || !sn.trim() || !selectedProjeto || !selectedTecnico}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] shadow-lg shadow-blue-600/20"
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : 'Alocar'}
                </button>
              </div>
            </div>
            
            {message && (
              <div className={`p-4 rounded-xl font-semibold border ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                {message.text}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Histórico Tabela */}
      <div className="pt-8 border-t border-[#1e3a5f]">
        <h2 className="text-xl font-bold text-white mb-6">Histórico de Alocações</h2>
        
        {loadingAlocacoes ? (
          <div className="p-8 text-center text-slate-500 flex justify-center gap-2">
            <Loader2 className="animate-spin" /> Carregando histórico...
          </div>
        ) : (
          <DataTable
            data={alocacoes}
            searchKeys={[
              'equipamentos.sn', 
              'equipamentos.produtos.nome', 
              'equipamentos.projetos.nome', 
              'tecnicos.nome', 
              'tasks.titulo',
              'observacao'
            ]}
            dateKey="data_alocacao"
            onDeleteMany={handleDeleteManyAlocacoes}
            emptyMessage="Nenhuma alocação registrada."
            columns={[
              { 
                key: 'data_alocacao', 
                label: 'Data/Hora', 
                tdClassName: 'text-sm text-slate-400 tabular-nums whitespace-nowrap',
                render: (aloc) => new Date(aloc.data_alocacao).toLocaleString() 
              },
              { 
                key: 'projeto', 
                label: 'Projeto', 
                render: (aloc) => <span className="text-slate-300 font-semibold">{aloc.equipamentos?.projetos?.nome}</span> 
              },
              { 
                key: 'equipamento', 
                label: 'Equipamento', 
                render: (aloc) => (
                  <div className="flex flex-col">
                    <span className="text-white font-semibold">{aloc.equipamentos?.produtos?.nome}</span>
                    <span className="font-mono text-xs text-blue-400">S/N: {aloc.equipamentos?.sn}</span>
                  </div>
                ) 
              },
              { 
                key: 'tecnico', 
                label: 'Técnico', 
                render: (aloc) => <span className="text-red-400 font-bold">{aloc.tecnicos?.nome}</span> 
              },
              { 
                key: 'task', 
                label: 'Tarefa', 
                render: (aloc) => <span className="text-slate-400 text-sm">{aloc.tasks?.titulo || '-'}</span> 
              },
              {
                key: 'actions',
                label: 'Ações',
                tdClassName: 'text-right whitespace-nowrap',
                render: (aloc) => (
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setEditModal(aloc)} 
                      className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30"
                      title="Editar alocação" aria-label="Editar alocação"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteAlocacao(aloc.id)} 
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30"
                      title="Excluir registro" aria-label="Excluir registro"
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

      {editModal && (
        <EditAlocacaoModal
          alocacao={editModal}
          tecnicos={tecnicos}
          onClose={() => setEditModal(null)}
          onUpdate={fetchAlocacoes}
        />
      )}
    </div>
  )
}
