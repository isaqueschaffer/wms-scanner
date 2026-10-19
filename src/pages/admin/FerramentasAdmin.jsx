import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Plus, PenTool, Edit, Trash2, X, History } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'

function FerramentaModal({ ferramenta, tipos, onClose, onUpdate }) {
  const isEditing = !!ferramenta
  const [loading, setLoading] = useState(false)

  // Form State
  const [tipoId, setTipoId] = useState(ferramenta?.tipo_id || '')
  const [estado, setEstado] = useState(ferramenta?.estado || 'Ótimo')
  const [identificador, setIdentificador] = useState(ferramenta?.identificador || '')
  const [descricao, setDescricao] = useState(ferramenta?.descricao || '')
  const [cidade, setCidade] = useState(ferramenta?.cidade || '')

  const ESTADOS = ['Ótimo', 'Bom', 'Desgastado']

  const handleSave = async (e) => {
    e.preventDefault()
    if (!tipoId) {
      alert('Selecione o tipo de ferramenta')
      return
    }

    const selectedTipo = tipos.find(t => t.id === tipoId)

    setLoading(true)
    const payload = {
      tipo_id: tipoId,
      nome: selectedTipo?.nome || 'Ferramenta',
      categoria: selectedTipo?.categoria || 'Manual',
      estado,
      identificador: identificador.trim() || null,
      quantidade: 1, // Fixado em 1 pois cada ferramenta passa a ser única
      descricao: descricao.trim() || null,
      cidade: cidade.trim() || null
    }

    let error;
    if (isEditing) {
      const res = await supabase.from('ferramentas').update(payload).eq('id', ferramenta.id)
      error = res.error
    } else {
      const res = await supabase.from('ferramentas').insert(payload).select().single()
      error = res.error
      if (!error && res.data) {
        await supabase.from('historico_ferramentas').insert({
          ferramenta_id: res.data.id,
          acao: 'CADASTRO',
          detalhes: 'Ferramenta registrada no estoque.'
        })
      }
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
              <label className="block text-sm font-semibold text-slate-300 mb-2">Tipo de Ferramenta (Modelo) *</label>
              <select
                value={tipoId}
                onChange={e => setTipoId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Selecione o Modelo --</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} - {t.categoria}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Crie novos modelos na tela de "Tipos de Ferramenta"</p>
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
              <label className="block text-sm font-semibold text-slate-300 mb-2">Identificador (Nº Série/Patrimônio)</label>
              <input
                type="text"
                value={identificador}
                onChange={e => setIdentificador(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: ALI-001"
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

function HistoricoModal({ ferramenta, onClose }) {
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHistorico() {
      setLoading(true)
      const { data } = await supabase
        .from('historico_ferramentas')
        .select(`
          *,
          tecnicos (nome)
        `)
        .eq('ferramenta_id', ferramenta.id)
        .order('created_at', { ascending: false })
      setHistorico(data || [])
      setLoading(false)
    }
    if(ferramenta) loadHistorico()
  }, [ferramenta])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a5f] shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="text-blue-500" />
              Histórico da Ferramenta
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {ferramenta.identificador ? `[${ferramenta.identificador}] ` : ''}{ferramenta.nome}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="text-center text-slate-500 py-8 flex justify-center gap-2">
              <Loader2 className="animate-spin" /> Carregando histórico...
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              Nenhum histórico registrado para esta ferramenta.
            </div>
          ) : (
            <div className="relative border-l border-[#1e3a5f] ml-3 space-y-6">
              {historico.map(h => (
                <div key={h.id} className="relative pl-6">
                  <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-[#111827] 
                    ${h.acao === 'ENTREGA' ? 'bg-blue-500' :
                      h.acao === 'DEVOLUCAO' ? 'bg-green-500' :
                      h.acao === 'TRANSFERENCIA' ? 'bg-orange-500' :
                      h.acao === 'CADASTRO' ? 'bg-purple-500' : 'bg-slate-500'
                    }`} 
                  />
                  <div className="bg-[#1e293b] border border-[#1e3a5f] rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md
                        ${h.acao === 'ENTREGA' ? 'bg-blue-500/20 text-blue-400' :
                          h.acao === 'DEVOLUCAO' ? 'bg-green-500/20 text-green-400' :
                          h.acao === 'TRANSFERENCIA' ? 'bg-orange-500/20 text-orange-400' :
                          h.acao === 'CADASTRO' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {h.acao}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                    {h.tecnicos && (
                      <div className="text-sm text-slate-300 font-semibold mb-1">
                        Técnico: {h.tecnicos.nome}
                      </div>
                    )}
                    {h.detalhes && (
                      <div className="text-sm text-slate-400 bg-[#0f172a] p-3 rounded-lg border border-[#1e3a5f]/50">
                        {h.detalhes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function FerramentasAdmin() {
  const [ferramentas, setFerramentas] = useState([])
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [historicoItem, setHistoricoItem] = useState(null)
  const [editItem, setEditItem] = useState(null)

  async function fetchDados() {
    setLoading(true)
    
    const [resFer, resTipos] = await Promise.all([
      supabase.from('ferramentas').select('*').order('created_at', { ascending: false }),
      supabase.from('tipos_ferramentas').select('*').order('nome')
    ])

    if (resFer.data) setFerramentas(resFer.data)
    if (resTipos.data) setTipos(resTipos.data)
      
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
          <p className="text-slate-500 mt-2">Catálogo de ferramentas, categorias e estoque total.</p>
        </div>
        
        <button
          onClick={() => { setEditItem(null); setModalOpen(true) }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
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
          searchKeys={['nome', 'categoria', 'estado', 'cidade', 'descricao', 'identificador']}
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
            { 
              key: 'identificador', 
              label: 'Identificador', 
              tdClassName: 'text-white font-mono font-bold text-center',
              render: (f) => f.identificador || '-'
            },
            { key: 'cidade', label: 'Cidade', tdClassName: 'text-slate-400' },
            {
              key: 'actions',
              label: 'Ações',
              tdClassName: 'text-right',
              render: (f) => (
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => setHistoricoItem(f)}
                    className="p-2 text-slate-400 hover:text-purple-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-purple-500/30"
                    title="Ver Histórico"
                  >
                    <History size={16} />
                  </button>
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
          tipos={tipos}
          onClose={() => setModalOpen(false)}
          onUpdate={fetchDados}
        />
      )}

      {historicoItem && (
        <HistoricoModal
          ferramenta={historicoItem}
          onClose={() => setHistoricoItem(null)}
        />
      )}
    </div>
  )
}
