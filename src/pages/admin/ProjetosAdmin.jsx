import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link, useSearchParams } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { DataTable } from '../../components/ui/DataTable'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { opcoesClientes } from '../../components/ui/opcoesBusca'
import { Pencil, Trash2, Plus, Loader2, List, MapPin, Building2, Search, LayoutGrid, Rows3 } from 'lucide-react'

const SERVICOS_DISPONIVEIS = [
  'CFTV', 'GPON', 'EPON', 'Automação', 'Controle de Acesso', 'Redes Estruturadas', 'PABX', 'Demonstração'
]

// Clientes sem UF cadastrada ficam agrupados aqui
const SEM_UF = '--'

const NOMES_UF = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

function ufDoCliente(c) {
  return (c?.estado || '').trim().toUpperCase() || SEM_UF
}

function nomeUf(uf) {
  if (uf === SEM_UF) return 'Sem estado'
  return NOMES_UF[uf] || uf
}

function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`
}

function normalizar(texto) {
  return (texto || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function ProjetosAdmin() {
  const [projetos, setProjetos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const [editId, setEditId] = useState(null)
  const [nome, setNome] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [servicos, setServicos] = useState([])
  const [escopo, setEscopo] = useState('')
  const [saving, setSaving] = useState(false)
  const [filtroCards, setFiltroCards] = useState('')

  // Navegação Estado → Cliente → Projetos fica na URL (?uf=SP&cliente=<id>, ou ?vista=lista)
  const [params, setParams] = useSearchParams()
  const vistaLista = params.get('vista') === 'lista'
  const ufAtual = params.get('uf')
  const clienteAtualId = params.get('cliente')

  function navegar(novos) {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries(novos)) if (v) next.set(k, v)
    setParams(next)
    setFiltroCards('')
  }

  async function fetchData() {
    setLoading(true)
    const [resProj, resCli] = await Promise.all([
      supabase.from('projetos').select('*, clientes(nome)').order('nome'),
      supabase.from('clientes').select('id, nome, razao_social, cnpj_cpf, email, cidade, estado').order('nome')
    ])
    setProjetos(resProj.data || [])
    setClientes(resCli.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const clientesPorId = useMemo(() => new Map(clientes.map(c => [c.id, c])), [clientes])

  const projetosPorCliente = useMemo(() => {
    const m = new Map()
    for (const p of projetos) m.set(p.cliente_id, (m.get(p.cliente_id) || 0) + 1)
    return m
  }, [projetos])

  const estados = useMemo(() => {
    const m = new Map()
    for (const c of clientes) {
      const uf = ufDoCliente(c)
      const e = m.get(uf) || { uf, clientes: 0, projetos: 0 }
      e.clientes += 1
      e.projetos += projetosPorCliente.get(c.id) || 0
      m.set(uf, e)
    }
    return [...m.values()].sort((a, b) => {
      if (a.uf === SEM_UF) return 1
      if (b.uf === SEM_UF) return -1
      return nomeUf(a.uf).localeCompare(nomeUf(b.uf), 'pt-BR')
    })
  }, [clientes, projetosPorCliente])

  const clienteAtual = clienteAtualId ? clientesPorId.get(clienteAtualId) : null
  // Se a URL só tiver o cliente, o estado vem do cadastro dele
  const ufEfetiva = ufAtual || (clienteAtual ? ufDoCliente(clienteAtual) : null)

  const clientesDoEstado = ufEfetiva ? clientes.filter(c => ufDoCliente(c) === ufEfetiva) : []
  const projetosDoCliente = clienteAtualId ? projetos.filter(p => p.cliente_id === clienteAtualId) : []

  const termo = normalizar(filtroCards.trim())
  const estadosFiltrados = termo
    ? estados.filter(e => normalizar(e.uf).includes(termo) || normalizar(nomeUf(e.uf)).includes(termo))
    : estados
  const clientesFiltrados = termo
    ? clientesDoEstado.filter(c => normalizar(c.nome).includes(termo) || normalizar(c.cidade).includes(termo))
    : clientesDoEstado

  function openNew() {
    setEditId(null)
    setNome('')
    // Dentro de um cliente, o novo projeto já vem com ele selecionado
    setClienteId(clienteAtual && !vistaLista ? clienteAtual.id : '')
    setServicos([])
    setEscopo('')
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditId(p.id)
    setNome(p.nome)
    setClienteId(p.cliente_id)
    setServicos(p.servicos || [])
    setEscopo(p.escopo || '')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!nome.trim() || !clienteId) return
    setSaving(true)

    const payload = { nome: nome.trim(), cliente_id: clienteId, servicos, escopo: escopo.trim() }

    if (editId) {
      await supabase.from('projetos').update(payload).eq('id', editId)
    } else {
      await supabase.from('projetos').insert(payload)
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

  function colunasProjetos(comCliente) {
    return [
      {
        key: 'nome',
        label: 'Nome do Projeto',
        render: (p) => (
          <Link to={`/admin/projetos/${p.id}`} className="font-semibold text-white hover:text-blue-400 hover:underline">
            {p.nome}
          </Link>
        ),
      },
      ...(comCliente
        ? [{ key: 'cliente', label: 'Cliente', render: (p) => <span className="text-slate-400">{p.clientes?.nome}</span> }]
        : []),
      { key: 'servicos', label: 'Serviços', render: (p) => (
          <div className="flex flex-wrap gap-1">
            {(p.servicos || []).map(s => (
              <span key={s} className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {s}
              </span>
            ))}
          </div>
        )
      },
      {
        key: 'actions',
        label: 'Ações',
        tdClassName: 'text-right space-x-2',
        render: (p) => (
          <>
            <Link to={`/admin/projetos/${p.id}`} className="p-2 inline-block text-slate-400 hover:text-green-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-green-500/30" title="Ver Itens Bipados" aria-label="Ver Itens Bipados">
              <List size={16} />
            </Link>
            <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30" title="Editar" aria-label="Editar">
              <Pencil size={16} />
            </button>
            <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30" title="Excluir" aria-label="Excluir">
              <Trash2 size={16} />
            </button>
          </>
        )
      }
    ]
  }

  const urlEstado = ufEfetiva ? `/admin/projetos?uf=${encodeURIComponent(ufEfetiva)}` : '/admin/projetos'

  function conteudo() {
    if (loading) {
      return <div className="p-8 text-center text-slate-400 flex justify-center gap-2"><Loader2 className="animate-spin" /> Carregando…</div>
    }

    // Lista completa (como era antes)
    if (vistaLista) {
      return (
        <DataTable
          key="lista"
          data={projetos}
          searchKeys={['nome', 'clientes.nome']}
          onDeleteMany={handleDeleteMany}
          emptyMessage="Nenhum projeto encontrado."
          columns={colunasProjetos(true)}
        />
      )
    }

    // Nível 3: projetos do cliente
    if (clienteAtualId) {
      return (
        <>
          <Breadcrumb items={[
            { label: 'Estados', to: '/admin/projetos' },
            { label: nomeUf(ufEfetiva || SEM_UF), to: urlEstado },
            { label: clienteAtual?.nome || 'Cliente' },
          ]} />
          {clienteAtual ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shrink-0">
                  <Building2 size={20} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{clienteAtual.nome}</h2>
                  <p className="text-sm text-slate-400">
                    {[clienteAtual.cidade, ufEfetiva !== SEM_UF ? ufEfetiva : null].filter(Boolean).join(' – ') || 'Sem cidade cadastrada'}
                    {' · '}
                    <span className="tabular-nums">{plural(projetosDoCliente.length, 'projeto', 'projetos')}</span>
                  </p>
                </div>
              </div>
              <DataTable
                key={clienteAtualId}
                data={projetosDoCliente}
                searchKeys={['nome']}
                onDeleteMany={handleDeleteMany}
                emptyMessage="Nenhum projeto para este cliente ainda."
                columns={colunasProjetos(false)}
              />
            </>
          ) : (
            <p className="p-8 text-center text-slate-400">Cliente não encontrado.</p>
          )}
        </>
      )
    }

    // Nível 2: clientes do estado
    if (ufEfetiva) {
      return (
        <>
          <Breadcrumb items={[
            { label: 'Estados', to: '/admin/projetos' },
            { label: nomeUf(ufEfetiva) },
          ]} />
          <FiltroCards valor={filtroCards} onChange={setFiltroCards} placeholder="Buscar cliente ou cidade…" />
          {clientesFiltrados.length === 0 ? (
            <p className="p-8 text-center text-slate-400">Nenhum cliente encontrado.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientesFiltrados.map(c => {
                const qtd = projetosPorCliente.get(c.id) || 0
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => navegar({ uf: ufEfetiva, cliente: c.id })}
                      className="w-full h-full text-left p-4 rounded-2xl bg-[#0f172a] border border-[#1e3a5f] hover:border-blue-500/50 hover:bg-[#13203a] transition-colors flex items-start gap-3"
                    >
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                        <Building2 size={18} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{c.nome}</p>
                        <p className="text-sm text-slate-400 truncate">{c.cidade || 'Sem cidade'}</p>
                        <p className={`text-xs mt-1 tabular-nums ${qtd ? 'text-blue-400' : 'text-slate-400'}`}>
                          {plural(qtd, 'projeto', 'projetos')}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )
    }

    // Nível 1: estados
    return (
      <>
        <FiltroCards valor={filtroCards} onChange={setFiltroCards} placeholder="Buscar estado…" />
        {estadosFiltrados.length === 0 ? (
          <p className="p-8 text-center text-slate-400">
            {estados.length ? 'Nenhum estado encontrado.' : 'Nenhum cliente cadastrado.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {estadosFiltrados.map(e => (
              <li key={e.uf}>
                <button
                  type="button"
                  onClick={() => navegar({ uf: e.uf })}
                  className="w-full h-full text-left p-4 rounded-2xl bg-[#0f172a] border border-[#1e3a5f] hover:border-blue-500/50 hover:bg-[#13203a] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl font-black text-white">{e.uf === SEM_UF ? '—' : e.uf}</span>
                    <MapPin size={18} className="text-blue-400" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-slate-300 mt-1 truncate">{nomeUf(e.uf)}</p>
                  <p className="text-xs text-slate-400 mt-2 tabular-nums">
                    {plural(e.clientes, 'cliente', 'clientes')} · {plural(e.projetos, 'projeto', 'projetos')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }

  const botaoVista = (ativo) =>
    `flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${ativo ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Projetos</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie os projetos associados aos clientes</p>
        </div>
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
          <div role="group" aria-label="Modo de visualização" className="flex rounded-xl border border-[#1e3a5f] bg-[#0f172a] p-1">
            <button type="button" onClick={() => navegar({})} aria-pressed={!vistaLista} className={botaoVista(!vistaLista)}>
              <LayoutGrid size={16} aria-hidden="true" /> Por estado
            </button>
            <button type="button" onClick={() => navegar({ vista: 'lista' })} aria-pressed={vistaLista} className={botaoVista(vistaLista)}>
              <Rows3 size={16} aria-hidden="true" /> Lista
            </button>
          </div>
          <button onClick={openNew} className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
            <Plus size={18} aria-hidden="true" /> Novo Projeto
          </button>
        </div>
      </div>

      <div className="mt-8">
        {conteudo()}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Projeto' : 'Novo Projeto'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Cliente">
            <SearchSelect
              name="cliente"
              value={clienteId}
              onChange={setClienteId}
              options={opcoesClientes(clientes)}
              placeholder="— Selecione o cliente —"
              vazio="Nenhum cliente encontrado"
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
            />
          </Field>
          <Field label="Nome do Projeto">
            <input
              type="text"
              name="nome"
              autoComplete="off"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500"
            />
          </Field>
          <fieldset>
            <legend className="block text-sm font-semibold text-slate-300 mb-2">Serviços</legend>
            <div className="flex flex-wrap gap-2">
              {SERVICOS_DISPONIVEIS.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer bg-[#0f172a] border border-[#1e3a5f] px-3 py-2 rounded-lg hover:border-blue-500/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={servicos.includes(s)}
                    onChange={(e) => {
                      if (e.target.checked) setServicos([...servicos, s])
                      else setServicos(servicos.filter(item => item !== s))
                    }}
                    className="w-4 h-4 rounded border-[#1e3a5f] bg-[#0f172a] checked:bg-blue-600 cursor-pointer"
                  />
                  <span className="text-sm text-slate-300">{s}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Escopo do Projeto">
            <textarea
              name="escopo"
              value={escopo}
              onChange={e => setEscopo(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Descreva as características e escopo deste projeto…"
            />
          </Field>
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

function FiltroCards({ valor, onChange, placeholder }) {
  return (
    <div className="relative mb-4 max-w-sm">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="search"
        name="filtro"
        aria-label={placeholder}
        autoComplete="off"
        value={valor}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}
