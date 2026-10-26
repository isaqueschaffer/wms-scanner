import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Loader2, ArrowLeft, Trash2, UserCheck, FileText, Plus, Minus, Pencil, Trash } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

function EditablePatrimonio({ eq, onUpdate }) {
  const [value, setValue] = useState(eq.n_patrimonio || '')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (value === eq.n_patrimonio) {
      setIsEditing(false)
      return
    }
    
    setLoading(true)
    const { error } = await supabase
      .from('equipamentos')
      .update({ n_patrimonio: value })
      .eq('id', eq.id)
      
    setLoading(false)
    if (error) {
      alert('Erro ao salvar patrimônio: ' + error.message)
      setValue(eq.n_patrimonio || '')
    } else {
      onUpdate()
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        disabled={loading}
        className="w-full max-w-[120px] bg-[#111827] border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
        placeholder="Nº…"
      />
    )
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="cursor-pointer min-h-[28px] px-2 py-1 rounded hover:bg-[#1e3a5f]/50 transition-colors text-sm border border-transparent hover:border-[#1e3a5f] flex items-center"
      title="Clique para editar"
    >
      {eq.n_patrimonio ? (
        <span className="text-emerald-400 font-bold font-mono">{eq.n_patrimonio}</span>
      ) : (
        <span className="text-slate-400 italic text-xs">Adicionar…</span>
      )}
    </div>
  )
}

function EquipamentoFormModal({ isOpen, onClose, projetoId, equipamento, produtos, onSaved }) {
  const [ean, setEan] = useState('')
  const [sn, setSn] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [patrimonio, setPatrimonio] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  // Produto sem S/N (ex.: bobina) é controlado só por quantidade
  const produto = produtos.find(p => p.ean === ean)
  const semSn = produto ? produto.controla_sn === false : false

  useEffect(() => {
    if (!isOpen) return
    setEan(equipamento?.ean || '')
    setSn(equipamento?.sn || '')
    setQuantidade(String(equipamento?.quantidade || 1))
    setPatrimonio(equipamento?.n_patrimonio || '')
    setErro('')
  }, [isOpen, equipamento])

  async function handleSubmit(e) {
    e.preventDefault()
    const snLimpo = sn.trim()
    const qtd = parseInt(quantidade, 10)

    if (!ean) {
      setErro('Selecione o produto.')
      return
    }
    if (semSn ? !qtd || qtd < 1 : !snLimpo) {
      setErro(semSn ? 'Informe uma quantidade maior que zero.' : 'Informe o S/N.')
      return
    }

    setSaving(true)
    setErro('')
    const patrimonioLimpo = patrimonio.trim() || null
    let error
    if (semSn && !equipamento) {
      // Soma na linha que o projeto já tem para este produto
      ;({ error } = await supabase.rpc('adicionar_equipamento_sem_sn', {
        p_projeto_id: projetoId,
        p_ean: ean,
        p_quantidade: qtd,
        p_patrimonio: patrimonioLimpo,
      }))
    } else {
      const payload = semSn
        ? { ean, sn: null, quantidade: qtd, n_patrimonio: patrimonioLimpo }
        : { ean, sn: snLimpo, quantidade: 1, n_patrimonio: patrimonioLimpo }
      ;({ error } = equipamento
        ? await supabase.from('equipamentos').update(payload).eq('id', equipamento.id)
        : await supabase.from('equipamentos').insert({ ...payload, projeto_id: projetoId }))
    }
    setSaving(false)

    if (error) {
      if (error.code === '23505') {
        setErro(semSn ? 'Este produto já tem uma linha sem S/N neste projeto.' : `O S/N "${snLimpo}" já existe neste projeto.`)
      } else {
        setErro(error.message)
      }
      return
    }
    onSaved()
    onClose()
  }

  const inputClass = 'w-full bg-[#0f172a] border border-[#1e3a5f] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500'
  const labelClass = 'block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={equipamento ? 'Editar equipamento' : 'Adicionar equipamento'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Produto" labelClassName={labelClass}>
          <select name="produto" value={ean} onChange={e => setEan(e.target.value)} className={inputClass}>
            <option value="">Selecione…</option>
            {produtos.map(p => (
              <option key={p.ean} value={p.ean}>{p.nome} ({p.ean})</option>
            ))}
          </select>
        </Field>
        {semSn ? (
          <div>
            <Field label="Quantidade" labelClassName={labelClass}>
              <input
                name="quantidade"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                autoComplete="off"
                value={quantidade}
                onChange={e => setQuantidade(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <p className="text-xs text-slate-400 mt-1.5">
              {equipamento
                ? 'Este produto não tem S/N. A quantidade informada substitui a atual.'
                : 'Este produto não tem S/N. A quantidade é somada à que o projeto já tem.'}
            </p>
          </div>
        ) : (
          <div>
            <Field label="S/N" labelClassName={labelClass}>
              <input name="sn" value={sn} onChange={e => setSn(e.target.value)} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${inputClass} font-mono`} placeholder="Número de série" />
            </Field>
            <p className="text-xs text-slate-400 mt-1.5">
              Produto sem número de série (ex.: bobina)? Desmarque “Controla S/N” em Produtos para cadastrar por quantidade.
            </p>
          </div>
        )}
        <Field label="Nº Patrimônio (opcional)" labelClassName={labelClass}>
          <input name="patrimonio" value={patrimonio} onChange={e => setPatrimonio(e.target.value)} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${inputClass} font-mono`} placeholder="Nº…" />
        </Field>

        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {equipamento ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function EquipamentosProjetoAdmin() {
  const { id } = useParams() // ID do projeto
  const [projeto, setProjeto] = useState(null)
  const [equipamentos, setEquipamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [alocacaoModal, setAlocacaoModal] = useState(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [produtos, setProdutos] = useState([])
  const [formModal, setFormModal] = useState({ open: false, equipamento: null })
  const [totalLixeira, setTotalLixeira] = useState(0)

  useDocumentTitle(projeto?.nome)

  // Função para agrupar equipamentos pelo nome do produto
  const agrupamentoRelatorio = equipamentos.reduce((acc, eq) => {
    const nome = eq.produtos?.nome || 'Desconhecido'
    const ean = eq.ean || 'Sem EAN'
    const key = `${ean}-${nome}`
    
    if (!acc[key]) {
      acc[key] = { ean, nome, count: 0 }
    }
    acc[key].count += eq.quantidade || 1
    return acc
  }, {})

  const relatorioData = Object.values(agrupamentoRelatorio).sort((a, b) => b.count - a.count)
  const totalProdutos = relatorioData.length

  async function fetchDados() {
    setLoading(true)
    
    // 1. Buscar detalhes do projeto e cliente
    const resProj = await supabase
      .from('projetos')
      .select('nome, clientes(nome)')
      .eq('id', id)
      .single()
      
    if (resProj.data) setProjeto(resProj.data)

    // 2. Buscar equipamentos vinculados
    const resEquip = await supabase
      .from('equipamentos')
      .select(`
        id, 
        ean, 
        sn, 
        n_patrimonio,
        quantidade,
        created_at,
        produtos(nome),
        alocacao_equipamentos (
          id,
          data_alocacao,
          observacao,
          tecnicos(nome),
          tasks(titulo)
        )
      `)
      .eq('projeto_id', id)
      .order('created_at', { ascending: false })
      
    if (resEquip.data) setEquipamentos(resEquip.data)

    // 3. Quantos itens estão na lixeira deste projeto
    const resLixeira = await supabase
      .from('equipamentos_lixeira')
      .select('id', { count: 'exact', head: true })
      .eq('projeto_id', id)
    setTotalLixeira(resLixeira.count || 0)
    
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [id])

  useEffect(() => {
    supabase.from('produtos').select('ean, nome, controla_sn').order('nome').then(({ data }) => {
      if (data) setProdutos(data)
    })
  }, [])

  async function handleDelete(idEquip) {
    if (!window.confirm('Mover este equipamento para a lixeira? Ele não contará mais neste projeto, mas poderá ser restaurado.')) return
    await supabase.from('equipamentos').delete().eq('id', idEquip)
    fetchDados()
  }

  async function handleDeleteMany(ids) {
    const { error } = await supabase.from('equipamentos').delete().in('id', ids)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchDados()
  }



  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'Projetos', to: '/admin/projetos' },
          ...(projeto?.clientes?.nome
            ? [{ label: projeto.clientes.nome, to: `/admin/projetos?q=${encodeURIComponent(projeto.clientes.nome)}` }]
            : []),
          { label: projeto?.nome || 'Carregando…' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
        <Link
          to="/admin/projetos"
          aria-label="Voltar para Projetos"
          className="p-3 bg-[#111827] hover:bg-[#1e3a5f]/50 border border-[#1e3a5f] rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white">
            {projeto ? projeto.nome : 'Carregando projeto…'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cliente: {projeto?.clientes?.nome || '…'}
          </p>
        </div>
        <button
          onClick={() => setFormModal({ open: true, equipamento: null })}
          className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={18} /> Adicionar Equipamento
        </button>
        <Link
          to={`/retirar/${id}`}
          className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20"
        >
          <Minus size={18} aria-hidden="true" /> Retirar do Projeto
        </Link>
        <Link
          to={`/admin/projetos/${id}/lixeira`}
          className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold transition-all"
        >
          <Trash size={18} aria-hidden="true" /> Lixeira{totalLixeira > 0 && <span className="tabular-nums">({totalLixeira})</span>}
        </Link>
        <button 
          onClick={() => setReportModalOpen(true)}
          className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
        >
          <FileText size={18} /> Relatório de Quantidades
        </button>
      </div>

      {/* Tabela via DataTable */}
      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-400 flex justify-center gap-2">
            <Loader2 className="animate-spin" /> Carregando equipamentos…
          </div>
        ) : (
          <DataTable
            data={equipamentos}
            searchKeys={['ean', 'sn', 'n_patrimonio', 'produtos.nome']}
            dateKey="created_at"
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum equipamento bipado para este projeto."
            rowClassName={(eq) => eq.alocacao_equipamentos?.length > 0 ? 'bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-[#1e3a5f]/10'}
            columns={[
              { 
                key: 'created_at', 
                label: 'Data/Hora', 
                tdClassName: 'text-sm text-slate-400 tabular-nums',
                render: (eq) => new Date(eq.created_at).toLocaleString('pt-BR') 
              },
              { key: 'ean', label: 'EAN', tdClassName: 'font-mono text-sm text-slate-400' },
              { key: 'produto', label: 'Produto', render: (eq) => <span className="font-semibold text-white">{eq.produtos?.nome || 'Desconhecido'}</span> },
              {
                key: 'sn',
                label: 'S/N',
                render: (eq) => eq.sn
                  ? <span className="font-mono font-bold text-blue-400 tracking-wide">{eq.sn}</span>
                  : <span className="text-xs italic text-slate-400">Sem S/N</span>,
              },
              {
                key: 'quantidade',
                label: 'Qtd',
                tdClassName: 'tabular-nums',
                render: (eq) => <span className="font-bold text-white">{eq.quantidade || 1}</span>,
              },
              { key: 'n_patrimonio', label: 'Nº Patrimônio', render: (eq) => <EditablePatrimonio eq={eq} onUpdate={fetchDados} /> },
              {
                key: 'actions',
                label: 'Ações',
                tdClassName: 'text-right',
                render: (eq) => (
                  <div className="flex items-center justify-end gap-2">
                    {eq.alocacao_equipamentos?.length > 0 && (
                      <button 
                        onClick={() => setAlocacaoModal(eq)} 
                        className="p-2 text-red-400 hover:text-red-300 transition-colors bg-[#0f172a] rounded-lg border border-red-500/30 hover:border-red-500/50"
                        title="Ver Histórico de Retirada" aria-label="Ver Histórico de Retirada"
                      >
                        <UserCheck size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setFormModal({ open: true, equipamento: eq })}
                      className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30"
                      title="Editar equipamento" aria-label="Editar equipamento"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(eq.id)} 
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30"
                      title="Excluir bipe" aria-label="Excluir bipe"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              }
            ]}
          />
        )}
      </div>

      <EquipamentoFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, equipamento: null })}
        projetoId={id}
        equipamento={formModal.equipamento}
        produtos={produtos}
        onSaved={fetchDados}
      />

      {/* Modal Histórico de Alocação */}
      <Modal
        isOpen={!!alocacaoModal}
        onClose={() => setAlocacaoModal(null)}
        title={`Histórico de Retirada${alocacaoModal?.sn ? ` — S/N ${alocacaoModal.sn}` : ''}`}
      >
        <div className="space-y-4">
              {alocacaoModal?.alocacao_equipamentos?.map((aloc, idx) => (
                <div key={aloc.id || idx} className="bg-[#0f172a] p-4 rounded-xl border border-[#1e3a5f]/50 relative">
                  <div className="absolute top-4 right-4 text-xs font-medium text-slate-400 tabular-nums">
                    {new Date(aloc.data_alocacao).toLocaleString('pt-BR')}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Técnico</span>
                      <p className="text-red-400 font-semibold">{aloc.tecnicos?.nome || 'N/A'}</p>
                    </div>
                    
                    {aloc.tasks?.titulo && (
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarefa / Projeto</span>
                        <p className="text-white text-sm">{aloc.tasks.titulo}</p>
                      </div>
                    )}
                    
                    {aloc.observacao && (
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observação</span>
                        <p className="text-slate-300 text-sm italic">"{aloc.observacao}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </Modal>

      {/* Modal de Relatório */}
      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title={`Relatório: ${projeto?.nome || 'Projeto'}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Resumo da quantidade de itens neste projeto agrupados por produto.</p>
          
          <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#111827] border-b border-[#1e3a5f]">
                  <th className="p-3 font-bold text-slate-400">EAN</th>
                  <th className="p-3 font-bold text-slate-400">Produto</th>
                  <th className="p-3 font-bold text-slate-400 text-center">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {relatorioData.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-slate-400">Nenhum equipamento bipado.</td>
                  </tr>
                ) : (
                  relatorioData.map(item => (
                    <tr key={`${item.ean}-${item.nome}`} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
                      <td className="p-3 font-mono text-slate-300">{item.ean}</td>
                      <td className="p-3 text-white font-semibold">{item.nome}</td>
                      <td className="p-3 text-center text-blue-400 font-black text-lg tabular-nums">{item.count}</td>
                    </tr>
                  ))
                )}
                
                {/* Linhas de Total */}
                {relatorioData.length > 0 && (
                  <tr className="bg-[#111827]">
                    <td colSpan="2" className="p-3 text-right text-slate-400 font-bold uppercase tracking-wider">Total de Produtos:</td>
                    <td className="p-3 text-center text-white font-black text-xl tabular-nums">{totalProdutos}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end pt-4">
            <button onClick={() => setReportModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
