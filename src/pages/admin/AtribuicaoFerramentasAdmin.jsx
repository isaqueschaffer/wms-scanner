import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, ArrowRightLeft, Plus, Edit, Trash2, X, ArchiveRestore, History } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'

function AtribuicaoModal({ atribuicao, ferramentas, tecnicos, atribuicoes, onClose, onUpdate }) {
  const isEditing = !!atribuicao
  const [ferramentaId, setFerramentaId] = useState(atribuicao?.ferramenta_id || '')
  const [tecnicoId, setTecnicoId] = useState(atribuicao?.tecnico_id || '')
  const [estado, setEstado] = useState(atribuicao?.ferramentas?.estado || 'Ótimo')
  const [dataAtribuicao, setDataAtribuicao] = useState(atribuicao?.data_atribuicao || '')
  const [dataVerificacao, setDataVerificacao] = useState(atribuicao?.data_verificacao || '')
  const [observacaoVerificacao, setObservacaoVerificacao] = useState(atribuicao?.observacao_verificacao || '')
  const [loading, setLoading] = useState(false)
  const ESTADOS = ['Ótimo', 'Bom', 'Desgastado']

  const ferramentasDisponiveis = ferramentas.filter(f => {
    const isAssigned = atribuicoes.some(a => a.ferramenta_id === f.id)
    if (!isAssigned) return true
    if (isEditing && atribuicao.ferramenta_id === f.id) return true
    return false
  })

  // Definir data de hoje como padrão para nova atribuição
  useEffect(() => {
    if (!isEditing && !dataAtribuicao) {
      const hoje = new Date().toISOString().split('T')[0]
      setDataAtribuicao(hoje)
    }
  }, [isEditing, dataAtribuicao])

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (!ferramentaId || !tecnicoId) {
      alert('Selecione a ferramenta e o técnico.')
      return
    }

    setLoading(true)
    const payload = {
      ferramenta_id: ferramentaId,
      tecnico_id: tecnicoId,
      quantidade: 1,
      data_atribuicao: dataAtribuicao || null,
      data_verificacao: dataVerificacao || null,
      observacao_verificacao: observacaoVerificacao.trim() || null
    }

    let error;
    if (isEditing) {
      const res = await supabase.from('atribuicao_ferramentas').update(payload).eq('id', atribuicao.id)
      error = res.error
    } else {
      const res = await supabase.from('atribuicao_ferramentas').insert(payload)
      error = res.error
    }
    
    if (!error) {
      const resFerr = await supabase.from('ferramentas').update({ estado }).eq('id', ferramentaId)
      if (resFerr.error) {
        console.error('Erro ao atualizar estado da ferramenta', resFerr.error)
      }
      
      if (!isEditing) {
        await supabase.from('historico_ferramentas').insert({
          ferramenta_id: ferramentaId,
          tecnico_id: tecnicoId,
          acao: 'ENTREGA',
          detalhes: observacaoVerificacao ? `Obs: ${observacaoVerificacao}` : 'Nova atribuição.'
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
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a5f] shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="text-blue-500" />
            {isEditing ? 'Editar Atribuição' : 'Nova Atribuição de Ferramenta'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Técnico *</label>
              <select
                value={tecnicoId}
                onChange={e => setTecnicoId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Selecione o Técnico --</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Ferramenta *</label>
              <select
                value={ferramentaId}
                onChange={e => setFerramentaId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Selecione a Ferramenta --</option>
                {ferramentasDisponiveis.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.identificador ? `[${f.identificador}] ` : ''}{f.nome} - {f.categoria}
                  </option>
                ))}
              </select>
            </div>



            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Estado da Ferramenta *</label>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              >
                {ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Data da Atribuição *</label>
              <input
                type="date"
                value={dataAtribuicao}
                onChange={e => setDataAtribuicao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Data da Verificação (Opcional)</label>
              <input
                type="date"
                value={dataVerificacao}
                onChange={e => setDataVerificacao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Observação (Opcional)</label>
              <textarea
                value={observacaoVerificacao}
                onChange={e => setObservacaoVerificacao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
                rows={2}
                placeholder="Ex: Alicate entregue em estado de novo"
              />
            </div>

          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-[#1e3a5f]">
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

function TransferModal({ atribuicao, tecnicos, onClose, onUpdate }) {
  const [novoTecnicoId, setNovoTecnicoId] = useState('')
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTransfer = async (e) => {
    e.preventDefault()
    if(!novoTecnicoId) return
    setLoading(true)

    const novoTecnico = tecnicos.find(t => t.id === novoTecnicoId)
    const antigoTecnicoNome = atribuicao.tecnicos?.nome

    await supabase.from('atribuicao_ferramentas')
      .update({ 
         tecnico_id: novoTecnicoId,
         data_atribuicao: new Date().toISOString().split('T')[0],
         data_verificacao: null,
         observacao_verificacao: null
      })
      .eq('id', atribuicao.id)

    await supabase.from('historico_ferramentas').insert({
      ferramenta_id: atribuicao.ferramenta_id,
      tecnico_id: novoTecnicoId,
      acao: 'TRANSFERENCIA',
      detalhes: `Transferido de ${antigoTecnicoNome} para ${novoTecnico?.nome}. ${obs ? 'Obs: '+obs : ''}`
    })

    setLoading(false)
    onUpdate()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a5f]">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="text-blue-500" />
            Transferir Ferramenta
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleTransfer} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Transferir para o Técnico *</label>
            <select
              value={novoTecnicoId}
              onChange={e => setNovoTecnicoId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none"
              required
            >
              <option value="">-- Selecione o Novo Técnico --</option>
              {tecnicos.filter(t => t.id !== atribuicao.tecnico_id).map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Observação (Opcional)</label>
            <input
              type="text"
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Ex: Empréstimo rápido para a obra X"
              className="w-full px-4 py-3 rounded-xl bg-[#1e293b] border border-[#1e3a5f] text-white focus:outline-none"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-slate-400">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />} Transferir
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AtribuicaoFerramentasAdmin() {
  const [atribuicoes, setAtribuicoes] = useState([])
  const [ferramentas, setFerramentas] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  async function fetchDados() {
    setLoading(true)
    const [resAttr, resFerr, resTec] = await Promise.all([
      supabase.from('atribuicao_ferramentas')
        .select(`
          *,
          ferramentas (nome, categoria, estado, identificador),
          tecnicos (nome)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('ferramentas').select('id, nome, categoria, quantidade, identificador').order('nome'),
      supabase.from('tecnicos').select('id, nome').order('nome')
    ])

    if (resAttr.data) setAtribuicoes(resAttr.data)
    if (resFerr.data) setFerramentas(resFerr.data)
    if (resTec.data) setTecnicos(resTec.data)
      
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [])

  async function handleDelete(id) {
    if (!window.confirm('Aviso: Isso apagará a atribuição sem registrar histórico. Para devoluções normais, use o botão de Devolver.')) return
    await supabase.from('atribuicao_ferramentas').delete().eq('id', id)
    fetchDados()
  }

  async function handleDevolver(a) {
    if (!window.confirm(`Confirmar devolução da ferramenta [${a.ferramentas?.identificador || a.ferramentas?.nome}] ao estoque?`)) return
    setLoading(true)
    
    await supabase.from('historico_ferramentas').insert({
      ferramenta_id: a.ferramenta_id,
      tecnico_id: a.tecnico_id,
      acao: 'DEVOLUCAO',
      detalhes: 'Devolvido ao estoque.'
    })
    
    await supabase.from('atribuicao_ferramentas').delete().eq('id', a.id)
    fetchDados()
  }

  async function handleDeleteMany(ids) {
    if (!window.confirm(`Excluir as ${ids.length} atribuições selecionadas?`)) return
    await supabase.from('atribuicao_ferramentas').delete().in('id', ids)
    fetchDados()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ArrowRightLeft className="text-blue-500" size={32} />
            Atribuição de Ferramentas
          </h1>
          <p className="text-slate-500 mt-2">Controle de quem está com quais ferramentas.</p>
        </div>
        
        <button
          onClick={() => { setEditItem(null); setModalOpen(true) }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} /> Nova Atribuição
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 flex justify-center gap-3 items-center">
          <Loader2 className="animate-spin" size={24} /> Carregando atribuições...
        </div>
      ) : (
        <DataTable
          data={atribuicoes}
          searchKeys={['tecnicos.nome', 'ferramentas.nome', 'ferramentas.identificador', 'ferramentas.categoria', 'observacao_verificacao']}
          dateKey="created_at"
          emptyMessage="Nenhuma atribuição registrada."
          columns={[
            { 
              key: 'tecnico', 
              label: 'Técnico', 
              render: (a) => <span className="text-white font-bold">{a.tecnicos?.nome}</span>
            },
            { 
              key: 'ferramenta', 
              label: 'Ferramenta', 
              render: (a) => (
                <div>
                  <div className="text-blue-400 font-semibold">
                    {a.ferramentas?.identificador ? `[${a.ferramentas.identificador}] ` : ''}{a.ferramentas?.nome}
                  </div>
                  <div className="text-xs text-slate-500">{a.ferramentas?.categoria}</div>
                </div>
              )
            },
            { 
              key: 'estado', 
              label: 'Estado', 
              render: (a) => {
                const est = a.ferramentas?.estado
                return (
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    est === 'Ótimo' ? 'bg-green-500/20 text-green-400' :
                    est === 'Bom' ? 'bg-blue-500/20 text-blue-400' :
                    est === 'Desgastado' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {est || '-'}
                  </span>
                )
              }
            },
            { 
              key: 'data_atribuicao', 
              label: 'Data Atribuição', 
              tdClassName: 'text-xs text-slate-400',
              render: (a) => a.data_atribuicao ? new Date(a.data_atribuicao + 'T00:00:00').toLocaleDateString() : '-'
            },
            { 
              key: 'data_verificacao', 
              label: 'Verificação', 
              tdClassName: 'text-xs text-slate-400',
              render: (a) => a.data_verificacao ? new Date(a.data_verificacao + 'T00:00:00').toLocaleDateString() : '-'
            },
            { 
              key: 'observacao', 
              label: 'Observação', 
              tdClassName: 'text-xs text-slate-400 truncate max-w-[200px]',
              render: (a) => a.observacao_verificacao || '-'
            },
            {
              key: 'actions',
              label: 'Ações',
              tdClassName: 'text-right',
              render: (a) => (
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleDevolver(a)} 
                    className="p-2 text-slate-400 hover:text-green-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-green-500/30"
                    title="Devolver ao Estoque"
                  >
                    <ArchiveRestore size={16} />
                  </button>
                  <button 
                    onClick={() => { setEditItem(a); setTransferModalOpen(true) }}
                    className="p-2 text-slate-400 hover:text-orange-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-orange-500/30"
                    title="Transferir para outro Técnico"
                  >
                    <ArrowRightLeft size={16} />
                  </button>
                </div>
              )
            }
          ]}
        />
      )}

      {modalOpen && (
        <AtribuicaoModal
          atribuicao={editItem}
          ferramentas={ferramentas}
          tecnicos={tecnicos}
          atribuicoes={atribuicoes}
          onClose={() => setModalOpen(false)}
          onUpdate={fetchDados}
        />
      )}

      {transferModalOpen && (
        <TransferModal
          atribuicao={editItem}
          tecnicos={tecnicos}
          onClose={() => setTransferModalOpen(false)}
          onUpdate={fetchDados}
        />
      )}
    </div>
  )
}
