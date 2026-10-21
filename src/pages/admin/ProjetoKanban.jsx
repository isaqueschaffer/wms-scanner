import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Plus, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'border-slate-500', bg: 'bg-slate-500/10' },
  { id: 'doing', label: 'In Progress', color: 'border-blue-500', bg: 'bg-blue-500/10' },
  { id: 'review', label: 'Review', color: 'border-orange-500', bg: 'bg-orange-500/10' },
  { id: 'done', label: 'Done', color: 'border-green-500', bg: 'bg-green-500/10' }
]

export function ProjetoKanban() {
  const [projetos, setProjetos] = useState([])
  const [selectedProjeto, setSelectedProjeto] = useState('')
  const [tecnicos, setTecnicos] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingProjetos, setLoadingProjetos] = useState(true)
  
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Task form
  const [editId, setEditId] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [status, setStatus] = useState('todo')

  useEffect(() => {
    async function init() {
      const [resProj, resTec] = await Promise.all([
        supabase.from('projetos').select('id, nome, clientes(nome)').order('nome'),
        supabase.from('tecnicos').select('id, nome').eq('ativo', true).order('nome')
      ])
      setProjetos(resProj.data || [])
      setTecnicos(resTec.data || [])
      setLoadingProjetos(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (selectedProjeto) {
      fetchTasks()
    } else {
      setTasks([])
    }
  }, [selectedProjeto])

  async function fetchTasks() {
    setLoading(true)
    const { data } = await supabase.from('tasks')
      .select('*, tecnicos(nome)')
      .eq('projeto_id', selectedProjeto)
      .order('ordem')
      .order('created_at')
    setTasks(data || [])
    setLoading(false)
  }

  function openNew(colStatus = 'todo') {
    setEditId(null)
    setTitulo('')
    setDescricao('')
    setTecnicoId('')
    setStatus(colStatus)
    setModalOpen(true)
  }

  function openEdit(t) {
    setEditId(t.id)
    setTitulo(t.titulo)
    setDescricao(t.descricao || '')
    setTecnicoId(t.tecnico_id || '')
    setStatus(t.status)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!titulo.trim() || !selectedProjeto) return
    setSaving(true)

    const payload = {
      projeto_id: selectedProjeto,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tecnico_id: tecnicoId || null,
      status
    }

    if (editId) {
      await supabase.from('tasks').update(payload).eq('id', editId)
    } else {
      await supabase.from('tasks').insert(payload)
    }

    setSaving(false)
    setModalOpen(false)
    fetchTasks()
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir esta tarefa?')) return
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks()
  }

  async function handleDrop(e, newStatus) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Kanban de Projetos</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie as tarefas e andamento do projeto</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {loadingProjetos ? <Loader2 className="animate-spin text-blue-500" aria-label="Carregando projetos" role="status" /> : (
            <select
              name="projeto_id"
              aria-label="Projeto"
              value={selectedProjeto}
              onChange={e => setSelectedProjeto(e.target.value)}
              className="w-full md:w-80 px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="">-- Selecione um Projeto --</option>
              {projetos.map(p => (
                <option key={p.id} value={p.id}>{p.nome} ({p.clientes?.nome})</option>
              ))}
            </select>
          )}
          
          <button 
            disabled={!selectedProjeto}
            onClick={() => openNew('todo')} 
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus size={18} aria-hidden="true" /> Tarefa
          </button>
        </div>
      </div>

      {!selectedProjeto ? (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[#1e3a5f] rounded-2xl p-12 text-slate-400">
          Selecione um projeto acima para ver o Kanban.
        </div>
      ) : loading ? (
        <div className="p-8 text-center text-slate-400 flex justify-center gap-2"><Loader2 className="animate-spin" aria-hidden="true" /> Carregando tarefas…</div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 items-start">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id)
            
            return (
              <div 
                key={col.id} 
                className={`flex-shrink-0 w-80 rounded-2xl bg-[#0f172a]/50 border-t-4 ${col.color} flex flex-col max-h-full`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, col.id)}
              >
                <div className={`p-4 font-bold text-slate-300 flex items-center justify-between ${col.bg} rounded-t-xl`}>
                  <span>{col.label}</span>
                  <span className="bg-[#0f172a] px-2 py-0.5 rounded text-xs tabular-nums">{colTasks.length}</span>
                </div>
                
                <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-3 min-h-[150px]">
                  {colTasks.map(t => (
                    <div 
                      key={t.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('taskId', t.id)}
                      className="bg-[#1e293b] p-4 rounded-xl border border-[#1e3a5f] hover:border-blue-500/50 cursor-grab active:cursor-grabbing shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-white mb-2 leading-tight">{t.titulo}</h4>
                        <div className="flex items-center gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-blue-400" title="Editar tarefa" aria-label="Editar tarefa"><Pencil size={14} aria-hidden="true" /></button>
                          <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-400" title="Excluir tarefa" aria-label="Excluir tarefa"><Trash2 size={14} aria-hidden="true" /></button>
                        </div>
                      </div>
                      
                      {t.descricao && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{t.descricao}</p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#0f172a]">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {t.tecnicos?.nome || 'Não atribuído'}
                        </span>
                        <GripVertical size={14} className="text-slate-400 cursor-grab" aria-hidden="true" />
                      </div>
                    </div>
                  ))}
                  
                  <button onClick={() => openNew(col.id)} className="w-full py-2 flex justify-center items-center gap-2 text-sm text-slate-400 hover:text-blue-400 hover:bg-[#1e293b] rounded-lg transition-colors border border-transparent hover:border-blue-500/30">
                    <Plus size={16} aria-hidden="true" /> Nova Tarefa
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Tarefa' : 'Nova Tarefa'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Título">
            <input
              name="titulo"
              autoComplete="off"
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              required
            />
          </Field>
          <Field label="Descrição">
            <textarea
              name="descricao"
              autoComplete="off"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                name="status"
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              >
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Atribuir Técnico">
              <select
                name="tecnico_id"
                value={tecnicoId}
                onChange={e => setTecnicoId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Não atribuído</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Field>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={!titulo.trim() || saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null} Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
