import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Loader2, ArrowLeft, Undo2, Trash2, UserCheck } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

const BTN_ACAO = 'p-2 text-slate-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50'

export function LixeiraProjetoAdmin() {
  const { id } = useParams() // ID do projeto
  const [projeto, setProjeto] = useState(null)
  const [itens, setItens] = useState([])
  const [produtos, setProdutos] = useState({})
  const [loading, setLoading] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null) // { tipo: 'ok' | 'erro', texto }

  useDocumentTitle(projeto ? `Lixeira — ${projeto.nome}` : 'Lixeira')

  async function fetchDados() {
    const [resProj, resLixeira, resProd] = await Promise.all([
      supabase.from('projetos').select('nome, clientes(nome)').eq('id', id).single(),
      supabase
        .from('equipamentos_lixeira')
        .select('id, ean, sn, quantidade, n_patrimonio, alocacoes, removido_em, removido_por_email')
        .eq('projeto_id', id)
        .order('removido_em', { ascending: false }),
      supabase.from('produtos').select('ean, nome'),
    ])
    if (resProj.data) setProjeto(resProj.data)
    if (resProd.data) setProdutos(Object.fromEntries(resProd.data.map(p => [p.ean, p.nome])))
    if (resLixeira.error) {
      setAviso({ tipo: 'erro', texto: `Erro ao carregar a lixeira: ${resLixeira.error.message}` })
    } else {
      setItens(resLixeira.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [id])

  async function restaurar(ids) {
    setOcupado(true)
    setAviso(null)
    const { data, error } = await supabase.rpc('restaurar_da_lixeira', { p_ids: ids })
    setOcupado(false)

    if (error) {
      setAviso({ tipo: 'erro', texto: `Erro ao restaurar: ${error.message}` })
    } else {
      const falhas = data?.falhas || []
      const ok = data?.restaurados || 0
      const detalhes = falhas.map(f => `${f.sn || f.ean} (${f.motivo})`).join('; ')
      setAviso(falhas.length
        ? { tipo: 'erro', texto: `${ok} restaurado(s). Não foi possível restaurar: ${detalhes}.` }
        : { tipo: 'ok', texto: `${ok} item(ns) devolvido(s) à lista principal.` })
    }
    fetchDados()
  }

  async function excluirDefinitivo(ids) {
    setOcupado(true)
    setAviso(null)
    const { error } = await supabase.from('equipamentos_lixeira').delete().in('id', ids)
    setOcupado(false)
    setAviso(error
      ? { tipo: 'erro', texto: `Erro ao excluir: ${error.message}` }
      : { tipo: 'ok', texto: `${ids.length} item(ns) excluído(s) definitivamente.` })
    fetchDados()
  }

  const confirmarExclusao = qtd =>
    `Excluir definitivamente ${qtd === 1 ? 'este item' : `estes ${qtd} itens`}? Não será possível restaurar.`

  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'Projetos', to: '/admin/projetos' },
          { label: projeto?.nome || 'Carregando…', to: `/admin/projetos/${id}` },
          { label: 'Lixeira' },
        ]}
      />

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
        <Link
          to={`/admin/projetos/${id}`}
          aria-label="Voltar para o projeto"
          className="p-3 bg-[#111827] hover:bg-[#1e3a5f]/50 border border-[#1e3a5f] rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Trash2 className="text-red-400" aria-hidden="true" /> Lixeira
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {projeto ? `${projeto.clientes?.nome || ''} › ${projeto.nome}` : '…'} — itens retirados do projeto,
            que podem voltar para a lista principal.
          </p>
        </div>
      </div>

      {aviso && (
        <p
          role={aviso.tipo === 'erro' ? 'alert' : 'status'}
          className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
            aviso.tipo === 'erro'
              ? 'text-red-300 bg-red-500/10 border-red-500/30'
              : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400 flex justify-center gap-2">
          <Loader2 className="animate-spin" aria-hidden="true" /> Carregando lixeira…
        </div>
      ) : (
        <DataTable
          data={itens}
          searchKeys={['ean', 'sn', 'n_patrimonio', 'removido_por_email']}
          dateKey="removido_em"
          emptyMessage="A lixeira deste projeto está vazia."
          acoesEmLote={[
            {
              label: qtd => `Restaurar ${qtd} ${qtd === 1 ? 'selecionado' : 'selecionados'}`,
              icon: Undo2,
              className: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30',
              onRun: restaurar,
            },
            {
              label: qtd => `Excluir definitivamente ${qtd}`,
              icon: Trash2,
              className: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30',
              confirmMessage: confirmarExclusao,
              onRun: excluirDefinitivo,
            },
          ]}
          columns={[
            {
              key: 'removido_em',
              label: 'Retirado em',
              tdClassName: 'text-sm text-slate-400 tabular-nums',
              render: item => new Date(item.removido_em).toLocaleString('pt-BR'),
            },
            {
              key: 'removido_por_email',
              label: 'Por',
              tdClassName: 'text-sm text-slate-400',
              render: item => item.removido_por_email || '—',
            },
            { key: 'ean', label: 'EAN', tdClassName: 'font-mono text-sm text-slate-400' },
            {
              key: 'produto',
              label: 'Produto',
              render: item => <span className="font-semibold text-white">{produtos[item.ean] || 'Desconhecido'}</span>,
            },
            {
              key: 'sn',
              label: 'S/N',
              render: item => item.sn
                ? <span className="font-mono font-bold text-blue-400 tracking-wide">{item.sn}</span>
                : <span className="text-xs italic text-slate-400">Sem S/N</span>,
            },
            {
              key: 'quantidade',
              label: 'Qtd',
              tdClassName: 'tabular-nums',
              render: item => <span className="font-bold text-white">{item.quantidade}</span>,
            },
            {
              key: 'alocacoes',
              label: 'Técnico',
              render: item => item.alocacoes?.length > 0
                ? (
                  <span className="inline-flex items-center gap-1 text-xs text-red-400" title="Tinha retirada por técnico; o histórico volta junto">
                    <UserCheck size={14} aria-hidden="true" /> {item.alocacoes.length}
                  </span>
                )
                : <span className="text-slate-500">—</span>,
            },
            {
              key: 'actions',
              label: 'Ações',
              tdClassName: 'text-right',
              render: item => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => restaurar([item.id])}
                    disabled={ocupado}
                    className={`${BTN_ACAO} hover:text-emerald-400 hover:border-emerald-500/30 disabled:opacity-50`}
                    title="Restaurar para a lista principal" aria-label="Restaurar para a lista principal"
                  >
                    <Undo2 size={16} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => window.confirm(confirmarExclusao(1)) && excluirDefinitivo([item.id])}
                    disabled={ocupado}
                    className={`${BTN_ACAO} hover:text-red-400 hover:border-red-500/30 disabled:opacity-50`}
                    title="Excluir definitivamente" aria-label="Excluir definitivamente"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
