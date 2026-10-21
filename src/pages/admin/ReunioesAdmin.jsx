import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Plus, Pencil, Trash2, CalendarDays } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { DataTable } from '../../components/ui/DataTable'

export function ReunioesAdmin() {
  const [projetos, setProjetos] = useState([])
  const [selectedProjeto, setSelectedProjeto] = useState('')
  const [reunioes, setReunioes] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingProjetos, setLoadingProjetos] = useState(true)
  
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Meeting form
  const [editId, setEditId] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [dataReuniao, setDataReuniao] = useState('')
  const [pauta, setPauta] = useState('')
  const [ata, setAta] = useState('')

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('projetos').select('id, nome, clientes(nome)').order('nome')
      setProjetos(data || [])
      setLoadingProjetos(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (selectedProjeto) {
      fetchReunioes()
    } else {
      setReunioes([])
    }
  }, [selectedProjeto])

  async function fetchReunioes() {
    setLoading(true)
    const { data } = await supabase.from('reunioes')
      .select('*')
      .eq('projeto_id', selectedProjeto)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
    setReunioes(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditId(null)
    setTitulo('')
    setDataReuniao(new Date().toISOString().split('T')[0])
    setPauta('')
    setAta('')
    setModalOpen(true)
  }

  function openEdit(r) {
    setEditId(r.id)
    setTitulo(r.titulo)
    setDataReuniao(r.data)
    setPauta(r.pauta || '')
    setAta(r.ata || '')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!titulo.trim() || !dataReuniao || !selectedProjeto) return
    setSaving(true)

    const payload = {
      projeto_id: selectedProjeto,
      titulo: titulo.trim(),
      data: dataReuniao,
      pauta: pauta.trim(),
      ata: ata.trim()
    }

    if (editId) {
      await supabase.from('reunioes').update(payload).eq('id', editId)
    } else {
      await supabase.from('reunioes').insert(payload)
    }

    setSaving(false)
    setModalOpen(false)
    fetchReunioes()
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir esta reunião? A ata será perdida.')) return
    await supabase.from('reunioes').delete().eq('id', id)
    fetchReunioes()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Reuniões e Atas</h1>
          <p className="text-sm text-slate-400 mt-1">Alinhamentos e documentação por projeto</p>
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
            onClick={openNew} 
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus size={18} aria-hidden="true" /> Nova Reunião
          </button>
        </div>
      </div>

      {!selectedProjeto ? (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[#1e3a5f] rounded-2xl p-12 text-slate-400 mt-8">
          Selecione um projeto acima para ver as reuniões.
        </div>
      ) : (
        <div className="mt-8">
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex justify-center gap-2"><Loader2 className="animate-spin" aria-hidden="true" /> Carregando reuniões…</div>
          ) : (
            <div className="space-y-4">
              {reunioes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-[#0f172a]/50 rounded-2xl">Nenhuma reunião registrada neste projeto.</div>
              ) : (
                reunioes.map(r => (
                  <div key={r.id} className="bg-[#0f172a] border border-[#1e3a5f] rounded-2xl p-6 hover:border-blue-500/30 transition-colors shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 text-blue-400 p-3 rounded-xl border border-blue-500/30">
                          <CalendarDays size={20} aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white leading-none mb-1">{r.titulo}</h3>
                          <span className="text-sm font-semibold text-slate-400">
                            {new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-slate-800 rounded-lg border border-transparent hover:border-blue-500/30" title="Editar" aria-label="Editar">
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-800 rounded-lg border border-transparent hover:border-red-500/30" title="Excluir" aria-label="Excluir">
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    
                    {r.pauta && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pauta</h4>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{r.pauta}</p>
                      </div>
                    )}
                    
                    {r.ata && (
                      <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ata / Resoluções</h4>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{r.ata}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Reunião' : 'Nova Reunião'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Título / Assunto" className="col-span-2">
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
            <Field label="Data">
              <input
                name="data_reuniao"
                autoComplete="off"
                type="date"
                value={dataReuniao}
                onChange={e => setDataReuniao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                required
              />
            </Field>
          </div>
          <Field label="Pauta (O que será discutido?)">
            <textarea
              name="pauta"
              autoComplete="off"
              value={pauta}
              onChange={e => setPauta(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </Field>
          <Field label="Ata da Reunião (Resoluções, Próximos Passos)">
            <textarea
              name="ata"
              autoComplete="off"
              value={ata}
              onChange={e => setAta(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-green-500 resize-none"
            />
          </Field>
          
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
