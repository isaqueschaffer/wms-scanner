import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { Modal } from '../components/ui/Modal'
import { DataTable } from '../components/DataTable'
import { Pencil, Trash2, Plus, Loader2, List } from 'lucide-react'

export function ProjetosAdmin() {
  const [projetos, setProjetos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  const [editId, setEditId] = useState(null)
  const [nome, setNome] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    setLoading(true)
    const [resProj, resCli] = await Promise.all([
      supabase.from('projetos').select('*, clientes(nome)').order('nome'),
      supabase.from('clientes').select('id, nome').order('nome')
    ])
    setProjetos(resProj.data || [])
    setClientes(resCli.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function openNew() {
    setEditId(null)
    setNome('')
    setClienteId('')
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditId(p.id)
    setNome(p.nome)
    setClienteId(p.cliente_id)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!nome.trim() || !clienteId) return
    setSaving(true)

    if (editId) {
      await supabase.from('projetos').update({ nome: nome.trim(), cliente_id: clienteId }).eq('id', editId)
    } else {
      await supabase.from('projetos').insert({ nome: nome.trim(), cliente_id: clienteId })
    }

    setSaving(false)
    setModalOpen(false)
    fetchData()
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir este projeto? TODOS os equipamentos vinculados a ele serão apagados.')) return
    await supabase.from('projetos').delete().eq('id', id)
    fetchData()
  }

  async function handleDeleteMany(ids) {
    const { error } = await supabase.from('projetos').delete().in('id', ids)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchData()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Projetos</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os projetos associados aos clientes</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
          <Plus size={18} /> Novo Projeto
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex justify-center gap-2"><Loader2 className="animate-spin" /> Carregando...</div>
        ) : (
          <DataTable
            data={projetos}
            searchKeys={['nome', 'clientes.nome']}
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum projeto encontrado."
            columns={[
              { key: 'nome', label: 'Nome do Projeto', render: (p) => <span className="font-semibold text-white">{p.nome}</span> },
              { key: 'cliente', label: 'Cliente', render: (p) => <span className="text-slate-400">{p.clientes?.nome}</span> },
              {
                key: 'actions',
                label: 'Ações',
                tdClassName: 'text-right space-x-2',
                render: (p) => (
                  <>
                    <Link to={`/admin/projetos/${p.id}`} className="p-2 inline-block text-slate-400 hover:text-green-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-green-500/30" title="Ver Itens Bipados">
                      <List size={16} />
                    </Link>
                    <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </>
                )
              }
            ]}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Projeto' : 'Novo Projeto'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Cliente</label>
            <select
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Selecione o cliente --</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Nome do Projeto</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={!nome.trim() || !clienteId || saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
