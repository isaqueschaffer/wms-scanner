import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Plus, PenTool, Edit, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'

function TipoModal({ tipo, onClose, onUpdate }) {
  const isEditing = !!tipo
  const [loading, setLoading] = useState(false)

  const [nome, setNome] = useState(tipo?.nome || '')
  const [categoria, setCategoria] = useState(tipo?.categoria || 'Manual')
  const [descricao, setDescricao] = useState(tipo?.descricao || '')

  const CATEGORIAS = ['Manual', 'Rede', 'Fibra Óptica']

  const handleSave = async (e) => {
    e.preventDefault()
    if (!nome.trim()) return

    setLoading(true)
    const payload = {
      nome: nome.trim(),
      categoria,
      descricao: descricao.trim() || null
    }

    let error
    if (isEditing) {
      const res = await supabase.from('tipos_ferramentas').update(payload).eq('id', tipo.id)
      error = res.error
    } else {
      const res = await supabase.from('tipos_ferramentas').insert(payload)
      error = res.error
    }

    setLoading(false)
    if (error) {
      alert('Erro ao salvar: ' + error.message)
    } else {
      onUpdate()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a5f]">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <PenTool className="text-blue-500" />
            {isEditing ? 'Editar Tipo' : 'Novo Tipo de Ferramenta'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Nome do Modelo/Tipo *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              required
              placeholder="Ex: Alicate de Crimpar"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Categoria *</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
            >
              {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Descrição Padrão</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              rows={3}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-slate-400 hover:text-white">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TiposFerramentasAdmin() {
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  async function fetchDados() {
    setLoading(true)
    const [resTipos, resFerr] = await Promise.all([
      supabase.from('tipos_ferramentas').select('*').order('nome'),
      supabase.from('ferramentas').select('tipo_id')
    ])
    if (resTipos.data) {
      const tiposComQtd = resTipos.data.map(t => ({
        ...t,
        quantidade: resFerr.data ? resFerr.data.filter(f => f.tipo_id === t.id).length : 0
      }))
      setTipos(tiposComQtd)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [])

  async function handleDelete(id) {
    if (!window.confirm('Excluir este tipo de ferramenta?')) return
    await supabase.from('tipos_ferramentas').delete().eq('id', id)
    fetchDados()
  }

  async function handleDeleteMany(ids) {
    if (!window.confirm(`Excluir ${ids.length} tipos selecionados?`)) return
    await supabase.from('tipos_ferramentas').delete().in('id', ids)
    fetchDados()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <PenTool className="text-blue-500" size={32} />
            Tipos de Ferramenta
          </h1>
          <p className="text-slate-500 mt-2">Cadastre os modelos base para facilitar a adição no estoque.</p>
        </div>
        
        <button
          onClick={() => { setEditItem(null); setModalOpen(true) }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Novo Tipo
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Carregando...</div>
      ) : (
        <DataTable
          data={tipos}
          searchKeys={['nome', 'categoria']}
          dateKey="created_at"
          onDeleteMany={handleDeleteMany}
          emptyMessage="Nenhum tipo cadastrado."
          columns={[
            { key: 'nome', label: 'Nome do Modelo', tdClassName: 'text-white font-bold' },
            { key: 'categoria', label: 'Categoria', tdClassName: 'text-slate-300' },
            { key: 'quantidade', label: 'Em Estoque', render: (t) => <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg font-bold">{t.quantidade} un</span> },
            { key: 'descricao', label: 'Descrição', tdClassName: 'text-slate-500 text-sm' },
            {
              key: 'actions',
              label: '',
              tdClassName: 'text-right',
              render: (t) => (
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => { setEditItem(t); setModalOpen(true) }} className="p-2 text-slate-400 hover:text-blue-400"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      )}

      {modalOpen && (
        <TipoModal
          tipo={editItem}
          onClose={() => setModalOpen(false)}
          onUpdate={fetchDados}
        />
      )}
    </div>
  )
}
