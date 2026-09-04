import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/ui/Modal'
import { DataTable } from '../../components/ui/DataTable'
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react'

export function ClientesAdmin() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  // Estado do formulário
  const [editId, setEditId] = useState(null)
  const [nome, setNome] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  function openNew() {
    setEditId(null)
    setNome('')
    setModalOpen(true)
  }

  function openEdit(c) {
    setEditId(c.id)
    setNome(c.nome)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)

    let error;
    if (editId) {
      const { error: err } = await supabase.from('clientes').update({ nome: nome.trim() }).eq('id', editId)
      error = err
    } else {
      const { error: err } = await supabase.from('clientes').insert({ nome: nome.trim() })
      error = err
    }

    setSaving(false)
    
    if (error) {
      console.error('Erro no Supabase:', error)
      alert(`Erro ao salvar no banco: ${error.message}\nVerifique as políticas RLS no Supabase.`)
      return
    }

    setModalOpen(false)
    fetchClientes()
  }

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza? Isso apagará também TODOS os projetos e equipamentos deste cliente!')) return
    await supabase.from('clientes').delete().eq('id', id)
    fetchClientes()
  }

  async function handleDeleteMany(ids) {
    // Note: cascade deletion happens in the DB if configured, otherwise needs care
    const { error } = await supabase.from('clientes').delete().in('id', ids)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchClientes()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie as empresas de destino</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex justify-center gap-2"><Loader2 className="animate-spin" /> Carregando...</div>
        ) : (
          <DataTable
            data={clientes}
            searchKeys={['nome']}
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum cliente encontrado."
            columns={[
              { key: 'nome', label: 'Nome do Cliente', render: (c) => <span className="font-semibold text-white">{c.nome}</span> },
              { 
                key: 'actions', 
                label: 'Ações', 
                tdClassName: 'text-right space-x-2', 
                render: (c) => (
                  <>
                    <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </>
                )
              }
            ]}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Cliente' : 'Novo Cliente'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Nome</label>
            <input
              autoFocus
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              placeholder="Ex: Trilan"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={!nome.trim() || saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
