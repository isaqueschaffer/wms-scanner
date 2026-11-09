import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Calendar, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

const POR_PAGINA_PADRAO = 25
const fmt = new Intl.NumberFormat('pt-BR')

function extrairValor(item, col) {
  if (!item) return ''
  if (typeof col.sortValue === 'function') {
    return col.sortValue(item)
  }

  const chave = col.sortKey || col.key
  if (!chave) return ''

  // Chaves com ponto (ex: 'produtos.nome')
  if (typeof chave === 'string' && chave.includes('.')) {
    const v = chave.split('.').reduce((o, i) => (o ? o[i] : null), item)
    return v ?? ''
  }

  const val = item[chave]
  if (val !== undefined && val !== null) {
    if (typeof val === 'object') {
      if (val.nome) return val.nome
      if (val.titulo) return val.titulo
      if (Array.isArray(val)) return val.join(', ')
    }
    return val
  }

  // Fallbacks relacionais comuns quando a coluna usa chave semântica
  if (chave === 'cliente' && item.clientes?.nome) return item.clientes.nome
  if (chave === 'produto' && item.produtos?.nome) return item.produtos.nome
  if (chave === 'tecnico' && item.tecnicos?.nome) return item.tecnicos.nome
  if (chave === 'ferramenta' && item.ferramentas?.nome) return item.ferramentas.nome
  if (chave === 'estado' && item.ferramentas?.estado) return item.ferramentas.estado
  if (chave === 'projeto') {
    if (item.projetos?.nome) return item.projetos.nome
    if (item.equipamentos?.projetos?.nome) return item.equipamentos.projetos.nome
  }
  if (chave === 'equipamento' && item.equipamentos?.produtos?.nome) return item.equipamentos.produtos.nome
  if (chave === 'tarefa' && item.tasks?.titulo) return item.tasks.titulo

  return ''
}

function compararValores(a, b, direcao = 'asc') {
  // Valores vazios/nulos sempre vão para o final
  const aVazio = a === null || a === undefined || a === ''
  const bVazio = b === null || b === undefined || b === ''
  if (aVazio && bVazio) return 0
  if (aVazio) return 1
  if (bVazio) return -1

  let res = 0

  if (typeof a === 'number' && typeof b === 'number') {
    res = a - b
  } else if (typeof a === 'boolean' && typeof b === 'boolean') {
    res = a === b ? 0 : a ? -1 : 1
  } else {
    const aStr = String(a).trim()
    const bStr = String(b).trim()

    // Detectar data ISO (ex: 2026-11-09T... ou 2026-11-09)
    const isDateA = /^\d{4}-\d{2}-\d{2}/.test(aStr) && !isNaN(Date.parse(aStr))
    const isDateB = /^\d{4}-\d{2}-\d{2}/.test(bStr) && !isNaN(Date.parse(bStr))

    if (isDateA && isDateB) {
      res = new Date(aStr).getTime() - new Date(bStr).getTime()
    } else {
      res = aStr.localeCompare(bStr, 'pt-BR', { numeric: true, sensitivity: 'base' })
    }
  }

  return direcao === 'desc' ? -res : res
}

export function DataTable({
  data = [],
  columns = [],
  searchKeys = [],
  dateKey = null,
  idKey = 'id',
  onDeleteMany = null,
  // Ações extras sobre as linhas marcadas: { label(qtd), icon, className, confirmMessage(qtd), onRun(ids) }
  acoesEmLote = [],
  emptyMessage = 'Nenhum registro encontrado.',
  rowClassName = null,
  defaultSortKey = null,
  defaultSortDir = 'asc'
}) {
  // Busca, datas, tamanho, página e ordenação ficam na URL
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState(() => params.get('q') ?? '')
  const [dataInicio, setDataInicio] = useState(() => params.get('de') ?? '')
  const [dataFim, setDataFim] = useState(() => params.get('ate') ?? '')
  const [itensPorPagina, setItensPorPagina] = useState(() => Number(params.get('n')) || POR_PAGINA_PADRAO)
  const [paginaAtual, setPaginaAtual] = useState(() => Number(params.get('p')) || 1)
  const [colunaOrdenacao, setColunaOrdenacao] = useState(() => params.get('ordem') ?? defaultSortKey)
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState(() => params.get('dir') ?? defaultSortDir)
  const [selecionados, setSelecionados] = useState([])
  const selecionavel = !!onDeleteMany || acoesEmLote.length > 0
  const checkTodosRef = useRef(null)

  function sincronizarUrl(mudancas) {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [chave, valor] of Object.entries(mudancas)) {
        if (
          valor === '' ||
          valor == null ||
          (chave === 'n' && valor === POR_PAGINA_PADRAO) ||
          (chave === 'p' && valor === 1) ||
          (chave === 'ordem' && (valor == null || valor === '')) ||
          (chave === 'dir' && (valor == null || valor === ''))
        ) {
          next.delete(chave)
        } else {
          next.set(chave, String(valor))
        }
      }
      return next
    }, { replace: true })
  }

  // Mudar um filtro volta para a primeira página
  function mudarFiltro(chave, valor, setter) {
    setter(valor)
    setPaginaAtual(1)
    sincronizarUrl({ [chave]: valor, p: 1 })
  }

  function alternarOrdenacao(colKey) {
    let novaColuna = colKey
    let novaDir = 'asc'

    if (colunaOrdenacao === colKey) {
      if (direcaoOrdenacao === 'asc') {
        novaDir = 'desc'
      } else {
        novaColuna = null
        novaDir = 'asc'
      }
    }

    setColunaOrdenacao(novaColuna)
    setDirecaoOrdenacao(novaDir)
    setPaginaAtual(1)
    sincronizarUrl({ ordem: novaColuna, dir: novaColuna ? novaDir : null, p: 1 })
  }

  function aplicarOrdenacao(colKey, dir) {
    setColunaOrdenacao(colKey)
    setDirecaoOrdenacao(dir)
    setPaginaAtual(1)
    sincronizarUrl({ ordem: colKey, dir, p: 1 })
  }

  function limparOrdenacao() {
    setColunaOrdenacao(null)
    setDirecaoOrdenacao('asc')
    setPaginaAtual(1)
    sincronizarUrl({ ordem: null, dir: null, p: 1 })
  }

  function irParaPagina(pagina) {
    setPaginaAtual(pagina)
    sincronizarUrl({ p: pagina })
  }

  // 1. Filtragem Geral (Busca e Data)
  const dadosFiltrados = useMemo(() => {
    let filtrados = data

    // Filtro de Busca por Texto
    if (busca) {
      const termo = busca.toLowerCase()
      filtrados = filtrados.filter(item => {
        return searchKeys.some(key => {
          const valor = key.split('.').reduce((o, i) => (o ? o[i] : null), item)
          return (valor || '').toString().toLowerCase().includes(termo)
        })
      })
    }

    // Filtro de Data
    if (dateKey && (dataInicio || dataFim)) {
      filtrados = filtrados.filter(item => {
        const itemDateStr = item[dateKey]
        if (!itemDateStr) return false

        const dataItem = new Date(itemDateStr).getTime()

        if (dataInicio) {
          const inicio = new Date(dataInicio).getTime()
          if (dataItem < inicio) return false
        }

        if (dataFim) {
          const fim = new Date(dataFim)
          fim.setHours(23, 59, 59, 999) // Até o final do dia
          if (dataItem > fim.getTime()) return false
        }

        return true
      })
    }

    return filtrados
  }, [data, busca, dataInicio, dataFim, searchKeys, dateKey])

  // Colunas que permitem ordenação
  const colunasSortaveis = useMemo(() => {
    return columns.filter(col => {
      const k = col.sortKey || col.key
      return col.sortable !== false && k && k !== 'actions' && k !== 'select' && !!col.label
    })
  }, [columns])

  // 2. Classificação / Ordenação
  const dadosOrdenados = useMemo(() => {
    if (!colunaOrdenacao) return dadosFiltrados

    const coluna = columns.find(c => (c.sortKey || c.key) === colunaOrdenacao)
    if (!coluna) return dadosFiltrados

    return [...dadosFiltrados].sort((itemA, itemB) => {
      const valA = extrairValor(itemA, coluna)
      const valB = extrairValor(itemB, coluna)
      return compararValores(valA, valB, direcaoOrdenacao)
    })
  }, [dadosFiltrados, colunaOrdenacao, direcaoOrdenacao, columns])

  // 3. Paginação (a página da URL pode ter ficado além do fim, ex.: depois de excluir)
  const totalPaginas = Math.ceil(dadosOrdenados.length / itensPorPagina)
  const paginaSegura = Math.min(Math.max(1, paginaAtual), Math.max(1, totalPaginas))
  const indexInicio = (paginaSegura - 1) * itensPorPagina
  const dadosPaginados = dadosOrdenados.slice(indexInicio, indexInicio + itensPorPagina)

  // 4. Seleção de Checkboxes
  const toggleSelecionarTudo = () => {
    if (todosMarcados || algunsMarcados) {
      setSelecionados([]) // Desmarca tudo
    } else {
      setSelecionados(dadosPaginados.map(item => item[idKey]))
    }
  }

  const toggleSelecionarLinha = (id) => {
    if (selecionados.includes(id)) {
      setSelecionados(selecionados.filter(item => item !== id))
    } else {
      setSelecionados([...selecionados, id])
    }
  }

  const handleExcluirSelecionados = () => {
    if (selecionados.length === 0) return
    if (window.confirm(`Tem certeza que deseja excluir os ${selecionados.length} itens selecionados?`)) {
      onDeleteMany(selecionados)
      setSelecionados([])
    }
  }

  function executarAcaoEmLote(acao) {
    if (selecionados.length === 0) return
    if (acao.confirmMessage && !window.confirm(acao.confirmMessage(selecionados.length))) return
    acao.onRun(selecionados)
    setSelecionados([])
  }

  const todosMarcados = dadosPaginados.length > 0 && dadosPaginados.every(item => selecionados.includes(item[idKey]))
  const algunsMarcados = !todosMarcados && dadosPaginados.some(item => selecionados.includes(item[idKey]))
  useEffect(() => {
    if (checkTodosRef.current) checkTodosRef.current.indeterminate = algunsMarcados
  }, [algunsMarcados])

  const campoFocoClass = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50'
  const colunaOrdenadaAtual = colunasSortaveis.find(c => (c.sortKey || c.key) === colunaOrdenacao)

  return (
    <div className="space-y-4">
      {/* Controles de Filtro e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Barra de Busca */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="search"
            name="busca"
            aria-label="Buscar na tabela"
            autoComplete="off"
            placeholder="Buscar…"
            value={busca}
            onChange={(e) => mudarFiltro('q', e.target.value, setBusca)}
            className="w-full pl-12 pr-4 py-3 bg-[#111827] border border-[#1e3a5f] rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filtro de Data */}
        {dateKey && (
          <div className="flex items-center gap-2 bg-[#111827] border border-[#1e3a5f] rounded-xl px-3 py-1.5 h-[50px] w-full md:w-auto">
            <Calendar size={18} className="text-slate-400 shrink-0" aria-hidden="true" />
            <input
              type="date"
              aria-label="Data inicial"
              value={dataInicio}
              onChange={(e) => mudarFiltro('de', e.target.value, setDataInicio)}
              className={`bg-transparent text-slate-300 text-sm rounded ${campoFocoClass} focus:text-white`}
            />
            <span className="text-slate-400 text-sm" aria-hidden="true">até</span>
            <input
              type="date"
              aria-label="Data final"
              value={dataFim}
              onChange={(e) => mudarFiltro('ate', e.target.value, setDataFim)}
              className={`bg-transparent text-slate-300 text-sm rounded ${campoFocoClass} focus:text-white`}
            />
          </div>
        )}
      </div>

      {/* Ações em Lote (Bulk) e Controles de Ordenação/Exibição */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[40px]">
        {selecionavel && selecionados.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-xl pl-4 pr-2 py-2">
            <span className="text-sm font-semibold text-blue-300 tabular-nums mr-1">
              {selecionados.length} {selecionados.length === 1 ? 'selecionado' : 'selecionados'}
            </span>
            {acoesEmLote.map((acao, i) => {
              const Icone = acao.icon
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => executarAcaoEmLote(acao)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${acao.className}`}
                >
                  {Icone && <Icone size={16} aria-hidden="true" />}
                  {acao.label(selecionados.length)}
                </button>
              )
            })}
            {onDeleteMany && (
              <button
                type="button"
                onClick={handleExcluirSelecionados}
                className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-all border border-red-500/30"
              >
                <Trash2 size={16} aria-hidden="true" />
                Excluir
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelecionados([])}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Limpar
            </button>
          </div>
        ) : <div />}

        {/* Controles da direita: Ordenação e Itens por Página */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-slate-400">
          {colunasSortaveis.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="tabela-ordenacao" className="text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                Classificar:
              </label>
              <select
                id="tabela-ordenacao"
                value={colunaOrdenacao ? `${colunaOrdenacao}:${direcaoOrdenacao}` : ''}
                onChange={(e) => {
                  const val = e.target.value
                  if (!val) {
                    limparOrdenacao()
                  } else {
                    const [k, d] = val.split(':')
                    aplicarOrdenacao(k, d)
                  }
                }}
                className={`bg-[#111827] border border-[#1e3a5f] rounded-lg px-2.5 py-1 text-white text-xs sm:text-sm font-medium ${campoFocoClass}`}
              >
                <option value="">Padrão (criação)</option>
                {colunasSortaveis.map((c) => {
                  const k = c.sortKey || c.key
                  const rotulo = c.label || k
                  return (
                    <optgroup key={k} label={rotulo}>
                      <option value={`${k}:asc`}>{rotulo} (A → Z / Menor)</option>
                      <option value={`${k}:desc`}>{rotulo} (Z → A / Maior)</option>
                    </optgroup>
                  )
                })}
              </select>
            </div>
          )}

          {/* Seletor de Itens por Página */}
          <div className="flex items-center gap-2">
            <label htmlFor="tabela-por-pagina" className="text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Exibir:
            </label>
            <select
              id="tabela-por-pagina"
              value={itensPorPagina}
              onChange={(e) => mudarFiltro('n', Number(e.target.value), setItensPorPagina)}
              className={`bg-[#111827] border border-[#1e3a5f] rounded-lg px-2 py-1 text-white text-xs sm:text-sm ${campoFocoClass}`}
            >
              <option value={25}>25 linhas</option>
              <option value={50}>50 linhas</option>
              <option value={100}>100 linhas</option>
              <option value={500}>500 linhas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0f172a] border-b border-[#1e3a5f]">
              {selecionavel && (
                <th scope="col" className="py-3 pl-4 pr-2 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos desta página"
                    ref={checkTodosRef}
                    checked={todosMarcados}
                    onChange={toggleSelecionarTudo}
                  />
                </th>
              )}
              {columns.map((col, idx) => {
                const colKey = col.sortKey || col.key
                const sortavel = col.sortable !== false && colKey && colKey !== 'actions' && colKey !== 'select' && !!col.label
                const estaAtivo = sortavel && colunaOrdenacao === colKey

                return (
                  <th
                    key={idx}
                    scope="col"
                    aria-sort={
                      estaAtivo
                        ? (direcaoOrdenacao === 'asc' ? 'ascending' : 'descending')
                        : (sortavel ? 'none' : undefined)
                    }
                    className={`px-3 py-3 sm:px-4 text-xs font-bold uppercase tracking-wider text-slate-400 align-middle ${col.className || ''}`}
                  >
                    {sortavel ? (
                      <button
                        type="button"
                        onClick={() => alternarOrdenacao(colKey)}
                        className="group inline-flex items-center gap-1.5 uppercase tracking-widest text-xs font-bold transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded select-none text-left"
                        title={`Classificar por ${col.label}${estaAtivo ? ` (${direcaoOrdenacao === 'asc' ? 'Crescente' : 'Decrescente'})` : ''}`}
                      >
                        <span className={estaAtivo ? 'text-blue-400 font-extrabold' : 'text-slate-400 group-hover:text-white transition-colors'}>
                          {col.label}
                        </span>
                        <span className="shrink-0 flex items-center">
                          {estaAtivo ? (
                            direcaoOrdenacao === 'asc' ? (
                              <ArrowUp size={14} className="text-blue-400" aria-label="Ordem crescente" />
                            ) : (
                              <ArrowDown size={14} className="text-blue-400" aria-label="Ordem decrescente" />
                            )
                          ) : (
                            <ArrowUpDown size={14} className="text-slate-600 opacity-40 group-hover:opacity-100 group-hover:text-slate-300 transition-all" aria-hidden="true" />
                          )}
                        </span>
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {dadosPaginados.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selecionavel ? 1 : 0)} className="p-8 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              dadosPaginados.map((item, index) => (
                <tr key={item[idKey] || index} className={`border-b border-[#1e3a5f]/30 transition-colors ${selecionados.includes(item[idKey]) ? 'bg-blue-500/10' : rowClassName ? rowClassName(item) : 'hover:bg-[#1e3a5f]/10'}`}>
                  {selecionavel && (
                    <td className="py-3 pl-4 pr-2 text-center">
                      <input
                        type="checkbox"
                        aria-label="Selecionar linha"
                        checked={selecionados.includes(item[idKey])}
                        onChange={() => toggleSelecionarLinha(item[idKey])}
                      />
                    </td>
                  )}
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-3 py-3 sm:px-4 text-sm align-middle break-words ${col.tdClassName || ''}`}>
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <nav aria-label="Paginação" className="p-4 border-t border-[#1e3a5f] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm text-slate-400 tabular-nums">
              Mostrando {fmt.format(indexInicio + 1)} até {fmt.format(Math.min(indexInicio + itensPorPagina, dadosOrdenados.length))} de {fmt.format(dadosOrdenados.length)} registros
              {colunaOrdenadaAtual && (
                <span className="ml-2 text-xs text-blue-400 font-medium">
                  • {colunaOrdenadaAtual.label} ({direcaoOrdenacao === 'asc' ? 'A → Z' : 'Z → A'})
                </span>
              )}
            </span>

            <div className="flex items-center gap-1 self-center sm:self-auto">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={paginaSegura === 1}
                onClick={() => irParaPagina(Math.max(1, paginaSegura - 1))}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e3a5f]/50 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>

              <div className="flex items-center">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let pageNum = paginaSegura - 2 + i;
                  if (paginaSegura <= 3) pageNum = i + 1;
                  else if (paginaSegura >= totalPaginas - 2) pageNum = totalPaginas - 4 + i;

                  if (pageNum > 0 && pageNum <= totalPaginas) {
                    return (
                      <button
                        type="button"
                        key={pageNum}
                        aria-label={`Página ${pageNum}`}
                        aria-current={paginaSegura === pageNum ? 'page' : undefined}
                        onClick={() => irParaPagina(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors tabular-nums ${
                          paginaSegura === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-[#1e3a5f]/50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  }
                  return null;
                })}
              </div>

              <button
                type="button"
                aria-label="Próxima página"
                disabled={paginaSegura === totalPaginas}
                onClick={() => irParaPagina(Math.min(totalPaginas, paginaSegura + 1))}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e3a5f]/50 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
