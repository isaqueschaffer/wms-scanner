import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/ui/Modal'
import { DataTable } from '../../components/ui/DataTable'
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react'

export function TecnicosAdmin() {
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  const [editId, setEditId] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('tecnicos').select('*').order('nome')
    setTecnicos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function openNew() {
    setEditId(null)
    setNome('')
    setTelefone('')
    setAtivo(true)
    setModalOpen(true)
  }

  function openEdit(t) {
    setEditId(t.id)
    setNome(t.nome)
    setTelefone(t.telefone || '')
    setAtivo(t.ativo)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)

    const payload = { nome: nome.trim(), telefone: telefone.trim(), ativo }

    if (editId) {
      await supabase.from('tecnicos').update(payload).eq('id', editId)
    } else {
      await supabase.from('tecnicos').insert(payload)
    }

    setSaving(false)
    setModalOpen(false)
    fetchData()
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir este técnico? Isso pode falhar se ele já possuir tarefas associadas.')) return
    const { error } = await supabase.from('tecnicos').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchData()
  }

  async function handleDeleteMany(ids) {
    if (!window.confirm(`Excluir os ${ids.length} técnicos selecionados?`)) return
    const { error } = await supabase.from('tecnicos').delete().in('id', ids)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchData()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Técnicos</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie a equipe de campo e projetos</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
          <Plus size={18} /> Novo Técnico
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex justify-center gap-2"><Loader2 className="animate-spin" /> Carregando...</div>
        ) : (
          <DataTable
            data={tecnicos}
            searchKeys={['nome', 'telefone']}
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum técnico encontrado."
            columns={[
              { key: 'nome', label: 'Nome', render: (t) => <span className="font-semibold text-white">{t.nome}</span> },
              { key: 'telefone', label: 'Telefone', render: (t) => <span className="text-slate-400">{t.telefone || '-'}</span> },
              { key: 'ativo', label: 'Status', render: (t) => (
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${t.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {t.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                ) 
              },
              {
                key: 'actions',
                label: 'Ações',
                tdClassName: 'text-right space-x-2',
                render: (t) => (
                  <>
                    <button onClick={() => openEdit(t)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </>
                )
              }
            ]}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Técnico' : 'Novo Técnico'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={ativo}
              onChange={e => setAtivo(e.target.checked)}
              className="w-5 h-5 rounded border-[#1e3a5f] bg-[#0f172a] checked:bg-blue-600 cursor-pointer"
            />
            <label htmlFor="ativo" className="text-sm font-semibold text-slate-300 cursor-pointer">Ativo na equipe</label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={!nome.trim() || saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
