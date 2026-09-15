import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Plus, PenTool, Edit, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'

function FerramentaModal({ ferramenta, tecnicos, onClose, onUpdate }) {
  const isEditing = !!ferramenta
  const [loading, setLoading] = useState(false)

  // Form State
  const [nome, setNome] = useState(ferramenta?.nome || '')
  const [categoria, setCategoria] = useState(ferramenta?.categoria || 'Manual')
  const [estado, setEstado] = useState(ferramenta?.estado || 'Ótimo')
  const [quantidade, setQuantidade] = useState(ferramenta?.quantidade || 1)
  const [descricao, setDescricao] = useState(ferramenta?.descricao || '')
  const [cidade, setCidade] = useState(ferramenta?.cidade || '')
  const [tecnicoId, setTecnicoId] = useState(ferramenta?.tecnico_id || '')
  const [dataAtribuicao, setDataAtribuicao] = useState(ferramenta?.data_atribuicao || '')
  const [dataVerificacao, setDataVerificacao] = useState(ferramenta?.data_verificacao || '')
  const [observacaoVerificacao, setObservacaoVerificacao] = useState(ferramenta?.observacao_verificacao || '')

  const CATEGORIAS = ['Manual', 'Rede', 'Fibra Óptica']
  const ESTADOS = ['Ótimo', 'Bom', 'Desgastado']

  const handleSave = async (e) => {
    e.preventDefault()
    if (!nome.trim()) {
      alert('Preencha o nome da ferramenta')
      return
    }

    setLoading(true)
    const payload = {
      nome: nome.trim(),
      categoria,
      estado,
      quantidade: parseInt(quantidade) || 1,
      descricao: descricao.trim() || null,
      cidade: cidade.trim() || null,
      tecnico_id: tecnicoId || null,
      data_atribuicao: dataAtribuicao || null,
      data_verificacao: dataVerificacao || null,
      observacao_verificacao: observacaoVerificacao.trim() || null
    }

    let error;
    if (isEditing) {
      const res = await supabase.from('ferramentas').update(payload).eq('id', ferramenta.id)
      error = res.error
    } else {
      const res = await supabase.from('ferramentas').insert(payload)
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
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a5f] shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <PenTool className="text-blue-500" />
            {isEditing ? 'Editar Ferramenta' : 'Nova Ferramenta'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Nome da Ferramenta *</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                required
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
              <label className="block text-sm font-semibold text-slate-300 mb-2">Estado *</label>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              >
                {ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Quantidade *</label>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={e => setQuantidade(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={e => setCidade(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Descrição</label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                rows={2}
              />
            </div>

            <div className="md:col-span-2 border-t border-[#1e3a5f] pt-4 mt-2">
              <h4 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-widest">Alocação e Verificação</h4>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Técnico Responsável (Opcional)</label>
              <select
                value={tecnicoId}
                onChange={e => setTecnicoId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Nenhum --</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Data da Atribuição</label>
              <input
                type="date"
                value={dataAtribuicao}
                onChange={e => setDataAtribuicao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Data da Verificação</label>
              <input
                type="date"
                value={dataVerificacao}
                onChange={e => setDataVerificacao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Observação da Verificação</label>
              <textarea
                value={observacaoVerificacao}
                onChange={e => setObservacaoVerificacao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                rows={2}
              />
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-[#1e3a5f] flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-semibold text-slate-400 hover:text-white hover:bg-[#1e3a5f]/50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center">
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Salvar Ferramenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function FerramentasAdmin() {
  const [ferramentas, setFerramentas] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  async function fetchDados() {
    setLoading(true)
    
    const [resFer, resTec] = await Promise.all([
      supabase.from('ferramentas').select('*, tecnicos(nome)').order('created_at', { ascending: false }),
      supabase.from('tecnicos').select('id, nome').eq('ativo', true).order('nome')
    ])

    if (resFer.data) setFerramentas(resFer.data)
    if (resTec.data) setTecnicos(resTec.data)
      
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [])

  async function handleDelete(id) {
    if (!window.confirm('Excluir esta ferramenta?')) return
    await supabase.from('ferramentas').delete().eq('id', id)
    fetchDados()
  }

  async function handleDeleteMany(ids) {
    if (!window.confirm(`Excluir as ${ids.length} ferramentas selecionadas?`)) return
    await supabase.from('ferramentas').delete().in('id', ids)
    fetchDados()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <PenTool className="text-blue-500" size={32} />
            Ferramentas
          </h1>
          <p className="text-slate-500 mt-2">Gestão de ferramentas, estados de conservação e atribuições.</p>
        </div>
        
        <button
          onClick={() => { setEditItem(null); setModalOpen(true) }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} /> Nova Ferramenta
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 flex justify-center gap-3 items-center">
          <Loader2 className="animate-spin" size={24} /> Carregando ferramentas...
        </div>
      ) : (
        <DataTable
          data={ferramentas}
          searchKeys={['nome', 'categoria', 'estado', 'cidade', 'descricao', 'tecnicos.nome']}
          dateKey="created_at"
          onDeleteMany={handleDeleteMany}
          emptyMessage="Nenhuma ferramenta cadastrada."
          columns={[
            { 
              key: 'nome', 
              label: 'Ferramenta', 
              render: (f) => (
                <div>
                  <div className="text-white font-bold">{f.nome}</div>
                  {f.descricao && <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]" title={f.descricao}>{f.descricao}</div>}
                </div>
              )
            },
            { 
              key: 'categoria', 
              label: 'Categoria', 
              render: (f) => <span className="px-2 py-1 bg-slate-800 rounded-lg text-xs font-semibold text-slate-300">{f.categoria}</span>
            },
            { 
              key: 'estado', 
              label: 'Estado', 
              render: (f) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  f.estado === 'Ótimo' ? 'bg-green-500/20 text-green-400' :
                  f.estado === 'Bom' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {f.estado}
                </span>
              )
            },
            { key: 'quantidade', label: 'Qtd', tdClassName: 'text-white font-mono' },
            { key: 'cidade', label: 'Cidade', tdClassName: 'text-slate-400' },
            { 
              key: 'tecnico', 
              label: 'Atribuído a', 
              render: (f) => f.tecnicos?.nome ? <span className="text-blue-400 font-semibold">{f.tecnicos.nome}</span> : <span className="text-slate-600">-</span>
            },
            { 
              key: 'data_atribuicao', 
              label: 'Atribuição', 
              tdClassName: 'text-xs text-slate-400',
              render: (f) => f.data_atribuicao ? new Date(f.data_atribuicao + 'T00:00:00').toLocaleDateString() : '-'
            },
            { 
              key: 'data_verificacao', 
              label: 'Verificação', 
              tdClassName: 'text-xs text-slate-400',
              render: (f) => f.data_verificacao ? new Date(f.data_verificacao + 'T00:00:00').toLocaleDateString() : '-'
            },
            {
              key: 'actions',
              label: 'Ações',
              tdClassName: 'text-right',
              render: (f) => (
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => { setEditItem(f); setModalOpen(true) }}
                    className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(f.id)} 
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            }
          ]}
        />
      )}

      {modalOpen && (
        <FerramentaModal
          ferramenta={editItem}
          tecnicos={tecnicos}
          onClose={() => setModalOpen(false)}
          onUpdate={fetchDados}
        />
      )}
    </div>
  )
}
