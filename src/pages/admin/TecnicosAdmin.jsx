import { useEffect, useId, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/ui/Modal'
import { DataTable } from '../../components/ui/DataTable'
import { Field } from '../../components/ui/Field'
import { Pencil, Trash2, Plus, Loader2, PenTool, Check } from 'lucide-react'

function EditableAtribuicao({ a }) {
  const obsId = useId()
  const [estado, setEstado] = useState(a.ferramentas?.estado || 'Ótimo')
  const [obs, setObs] = useState(a.observacao_verificacao || '')
  const [dataVerificacao, setDataVerificacao] = useState(a.data_verificacao || new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const ESTADOS = ['Ótimo', 'Bom', 'Desgastado']

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const { error: errAttr } = await supabase.from('atribuicao_ferramentas')
      .update({ 
        observacao_verificacao: obs.trim() || null,
        data_verificacao: dataVerificacao || null
      })
      .eq('id', a.id)
      
    const { error: errFerr } = await supabase.from('ferramentas')
      .update({ estado })
      .eq('id', a.ferramenta_id)
      
    if (!errAttr && !errFerr) {
      await supabase.from('historico_ferramentas').insert({
        ferramenta_id: a.ferramenta_id,
        tecnico_id: a.tecnico_id,
        acao: 'VERIFICACAO',
        detalhes: `Estado: ${estado}. ${obs ? 'Obs: '+obs.trim() : ''}`
      })
    }
    
    setSaving(false)
    if (errAttr || errFerr) {
      alert('Erro ao atualizar: ' + (errAttr?.message || errFerr?.message))
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  // Calcular dias desde a última verificação ou atribuição
  const dataRefStr = a.data_verificacao || a.data_atribuicao
  const dataRef = new Date(dataRefStr + 'T00:00:00')
  const hoje = new Date()
  const diffTime = Math.abs(hoje - dataRef)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1 // -1 para compensar o mesmo dia
  const isVencido = diffDays >= 15

  return (
    <div className={`p-4 rounded-xl border ${isVencido ? 'bg-red-500/10 border-red-500/50' : 'bg-[#0f172a] border-[#1e3a5f]'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className={`font-bold text-lg ${isVencido ? 'text-red-400' : 'text-white'}`}>
            {a.ferramentas?.identificador ? `[${a.ferramentas.identificador}] ` : ''}{a.ferramentas?.nome}
          </h4>
          <p className="text-xs text-slate-400 mt-1">Categoria: {a.ferramentas?.categoria}</p>
          {isVencido && (
            <p className="text-xs font-bold text-red-400 mt-1">
              ⚠️ Verificação pendente ({diffDays} dias sem checagem)
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">
            Atribuído: {a.data_atribuicao ? new Date(a.data_atribuicao + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-3">
        <Field label="Estado" className="w-full md:w-1/4" labelClassName="block text-xs font-semibold text-slate-400 mb-1">
          <select 
            name="estado"
            value={estado} 
            onChange={e => setEstado(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-[#1e3a5f] text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">-- Selecione --</option>
            {ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
          </select>
        </Field>
        <Field label="Data Verificação" className="w-full md:w-1/4" labelClassName="block text-xs font-semibold text-slate-400 mb-1">
          <input 
            type="date" 
            name="data_verificacao"
            value={dataVerificacao} 
            onChange={e => setDataVerificacao(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg bg-[#1e293b] border ${isVencido ? 'border-red-500/50' : 'border-[#1e3a5f]'} text-sm text-white focus:outline-none focus:border-blue-500`}
          />
        </Field>
        <div className="w-full md:flex-1">
          <label htmlFor={obsId} className="block text-xs font-semibold text-slate-400 mb-1">Observação</label>
          <div className="flex gap-2">
            <input 
              id={obsId}
              type="text" 
              name="observacao_verificacao"
              autoComplete="off"
              value={obs} 
              onChange={e => setObs(e.target.value)}
              placeholder="Ex: Entrega ok"
              className="w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-[#1e3a5f] text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button 
              onClick={handleSave} 
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 min-w-[90px]
                ${saved ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50'}
              `}
            >
              {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : saved ? <><Check size={14} aria-hidden="true" /> Salvo</> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FerramentasTecnicoModal({ tecnico, onClose }) {
  const [atribuicoes, setAtribuicoes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAtribuicoes() {
      if (!tecnico) return
      setLoading(true)
      const { data } = await supabase
        .from('atribuicao_ferramentas')
        .select('*, ferramentas(nome, categoria, estado, identificador)')
        .eq('tecnico_id', tecnico.id)
        .order('data_atribuicao', { ascending: false })
      
      setAtribuicoes(data || [])
      setLoading(false)
    }
    fetchAtribuicoes()
  }, [tecnico])

  if (!tecnico) return null

  return (
    <Modal isOpen={!!tecnico} onClose={onClose} title={`Ferramentas - ${tecnico.nome}`}>
      {loading ? (
        <div className="p-8 text-center text-slate-400 flex justify-center gap-2"><Loader2 className="animate-spin" aria-hidden="true" /> Carregando…</div>
      ) : atribuicoes.length === 0 ? (
        <div className="p-8 text-center text-slate-400">Nenhuma ferramenta atribuída a este técnico.</div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {atribuicoes.map(a => (
            <EditableAtribuicao key={a.id} a={a} />
          ))}
        </div>
      )}
      <div className="flex justify-end pt-4 mt-6 border-t border-[#1e3a5f]">
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">Fechar</button>
      </div>
    </Modal>
  )
}

export function TecnicosAdmin() {
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [ferramentasModalTecnico, setFerramentasModalTecnico] = useState(null)
  
  const [editId, setEditId] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
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
    setCidade('')
    setAtivo(true)
    setModalOpen(true)
  }

  function openEdit(t) {
    setEditId(t.id)
    setNome(t.nome)
    setTelefone(t.telefone || '')
    setCidade(t.cidade || '')
    setAtivo(t.ativo)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)

    const payload = { nome: nome.trim(), telefone: telefone.trim(), cidade: cidade.trim(), ativo }

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Técnicos</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie a equipe de campo e projetos</p>
        </div>
        <button onClick={openNew} className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
          <Plus size={18} aria-hidden="true" /> Novo Técnico
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-400 flex justify-center gap-2"><Loader2 className="animate-spin" aria-hidden="true" /> Carregando…</div>
        ) : (
          <DataTable
            data={tecnicos}
            searchKeys={['nome', 'telefone', 'cidade']}
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum técnico encontrado."
            columns={[
              { key: 'nome', label: 'Nome', render: (t) => <span className="font-semibold text-white">{t.nome}</span> },
              { key: 'cidade', label: 'Cidade', render: (t) => <span className="text-slate-400">{t.cidade || '-'}</span> },
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
                    <button onClick={() => setFerramentasModalTecnico(t)} className="p-2 text-slate-400 hover:text-green-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-green-500/30" title="Ver Ferramentas" aria-label="Ver Ferramentas">
                      <PenTool size={16} aria-hidden="true" />
                    </button>
                    <button onClick={() => openEdit(t)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30" title="Editar" aria-label="Editar">
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30" title="Excluir" aria-label="Excluir">
                      <Trash2 size={16} aria-hidden="true" />
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
          <Field label="Nome">
            <input
              type="text"
              name="nome"
              autoComplete="off"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
              required
            />
          </Field>
          <Field label="Telefone">
            <input
              type="text"
              name="telefone"
              autoComplete="off"
              inputMode="tel"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
            />
          </Field>
          <Field label="Cidade">
            <input
              type="text"
              name="cidade"
              autoComplete="off"
              value={cidade}
              onChange={e => setCidade(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
            />
          </Field>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              name="ativo"
              checked={ativo}
              onChange={e => setAtivo(e.target.checked)}
              className="w-5 h-5 rounded border-[#1e3a5f] bg-[#0f172a] checked:bg-blue-600 cursor-pointer"
            />
            <label htmlFor="ativo" className="text-sm font-semibold text-slate-300 cursor-pointer">Ativo na equipe</label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={!nome.trim() || saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null} Salvar
            </button>
          </div>
        </form>
      </Modal>

      <FerramentasTecnicoModal 
        tecnico={ferramentasModalTecnico} 
        onClose={() => setFerramentasModalTecnico(null)} 
      />
    </div>
  )
}
