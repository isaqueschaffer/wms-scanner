import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/ui/Modal'
import { DataTable } from '../components/DataTable'
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react'

export function ProdutosAdmin() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  const [editEan, setEditEan] = useState(null)
  const [ean, setEan] = useState('')
  const [nome, setNome] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchProdutos() {
    setLoading(true)
    const { data } = await supabase.from('produtos').select('*').order('nome')
    setProdutos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProdutos()
  }, [])

  function openNew() {
    setEditEan(null)
    setEan('')
    setNome('')
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditEan(p.ean)
    setEan(p.ean)
    setNome(p.nome)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!ean.trim() || !nome.trim()) return
    setSaving(true)

    if (editEan) {
      // Nota: Mudar PK (ean) não é trivial. Aqui assumimos que só editamos o nome.
      await supabase.from('produtos').update({ nome: nome.trim() }).eq('ean', editEan)
    } else {
      await supabase.from('produtos').insert({ ean: ean.trim(), nome: nome.trim() })
    }

    setSaving(false)
    setModalOpen(false)
    fetchProdutos()
  }

  async function handleDelete(eanToDelete) {
    if (!window.confirm('Excluir este produto? Ele será removido de todas as leituras que o referenciam.')) return
    await supabase.from('produtos').delete().eq('ean', eanToDelete)
    fetchProdutos()
  }

  async function handleDeleteMany(eans) {
    const { error } = await supabase.from('produtos').delete().in('ean', eans)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchProdutos()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Produtos</h1>
          <p className="text-sm text-slate-500 mt-1">Catálogo de EANs conhecidos</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex justify-center gap-2"><Loader2 className="animate-spin" /> Carregando...</div>
        ) : (
          <DataTable
            data={produtos}
            searchKeys={['ean', 'nome']}
            idKey="ean"
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum produto encontrado."
            columns={[
              { key: 'ean', label: 'EAN (Código)', tdClassName: 'font-mono text-sm text-blue-400' },
              { key: 'nome', label: 'Nome do Produto', render: (p) => <span className="font-semibold text-white">{p.nome}</span> },
              {
                key: 'actions',
                label: 'Ações',
                tdClassName: 'text-right space-x-2',
                render: (p) => (
                  <>
                    <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(p.ean)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </>
                )
              }
            ]}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editEan ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">EAN (Código de Barras)</label>
            <input
              autoFocus={!editEan}
              type="text"
              value={ean}
              onChange={e => setEan(e.target.value)}
              disabled={!!editEan}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Nome</label>
            <input
              autoFocus={!!editEan}
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={!ean.trim() || !nome.trim() || saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
