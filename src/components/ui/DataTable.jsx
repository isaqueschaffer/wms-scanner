import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-react'

const POR_PAGINA_PADRAO = 25
const fmt = new Intl.NumberFormat('pt-BR')

export function DataTable({
  data = [],
  columns = [],
  searchKeys = [],
  dateKey = null,
  idKey = 'id',
  onDeleteMany = null,
  emptyMessage = 'Nenhum registro encontrado.',
  rowClassName = null
}) {
  // Busca, datas, tamanho e página ficam na URL: voltar de um detalhe mantém a lista como estava
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState(() => params.get('q') ?? '')
  const [dataInicio, setDataInicio] = useState(() => params.get('de') ?? '')
  const [dataFim, setDataFim] = useState(() => params.get('ate') ?? '')
  const [itensPorPagina, setItensPorPagina] = useState(() => Number(params.get('n')) || POR_PAGINA_PADRAO)
  const [paginaAtual, setPaginaAtual] = useState(() => Number(params.get('p')) || 1)
  const [selecionados, setSelecionados] = useState([])

  function sincronizarUrl(mudancas) {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [chave, valor] of Object.entries(mudancas)) {
        if (valor === '' || valor == null || (chave === 'n' && valor === POR_PAGINA_PADRAO) || (chave === 'p' && valor === 1)) {
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

  // 2. Paginação (a página da URL pode ter ficado além do fim, ex.: depois de excluir)
  const totalPaginas = Math.ceil(dadosFiltrados.length / itensPorPagina)
  const paginaSegura = Math.min(Math.max(1, paginaAtual), Math.max(1, totalPaginas))
  const indexInicio = (paginaSegura - 1) * itensPorPagina
  const dadosPaginados = dadosFiltrados.slice(indexInicio, indexInicio + itensPorPagina)

  // 3. Seleção de Checkboxes
  const toggleSelecionarTudo = () => {
    if (selecionados.length === dadosPaginados.length && dadosPaginados.length > 0) {
      setSelecionados([]) // Desmarca tudo da página atual
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

  const campoFocoClass = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50'

  return (
    <div className="space-y-4">
      {/* Controles de Filtro e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

        {/* Barra de Busca */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-500" aria-hidden="true" />
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
            <Calendar size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
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

      {/* Ações em Lote (Bulk) */}
      <div className="flex items-center justify-between min-h-[40px]">
        {onDeleteMany && selecionados.length > 0 ? (
          <button
            type="button"
            onClick={handleExcluirSelecionados}
            className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-all border border-red-500/30"
          >
            <Trash2 size={16} aria-hidden="true" />
            Excluir {selecionados.length} {selecionados.length === 1 ? 'selecionado' : 'selecionados'}
          </button>
        ) : <div />} {/* Espaçador vazio */}

        {/* Seletor de Itens por Página */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <label htmlFor="tabela-por-pagina">Exibir:</label>
          <select
            id="tabela-por-pagina"
            value={itensPorPagina}
            onChange={(e) => mudarFiltro('n', Number(e.target.value), setItensPorPagina)}
            className={`bg-[#111827] border border-[#1e3a5f] rounded-lg px-2 py-1 text-white ${campoFocoClass}`}
          >
            <option value={25}>25 linhas</option>
            <option value={50}>50 linhas</option>
            <option value={100}>100 linhas</option>
            <option value={500}>500 linhas</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl overflow-x-auto shadow-2xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#0f172a] border-b border-[#1e3a5f]">
              {onDeleteMany && (
                <th scope="col" className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos desta página"
                    checked={selecionados.length === dadosPaginados.length && dadosPaginados.length > 0}
                    onChange={toggleSelecionarTudo}
                    className="w-4 h-4 rounded bg-[#0a0e1a] border-[#1e3a5f] text-blue-600 focus:ring-blue-500/50 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th key={idx} scope="col" className={`p-4 text-xs font-bold uppercase tracking-widest text-slate-400 ${col.className || ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dadosPaginados.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onDeleteMany ? 1 : 0)} className="p-8 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              dadosPaginados.map((item, index) => (
                <tr key={item[idKey] || index} className={`border-b border-[#1e3a5f]/30 transition-colors ${rowClassName ? rowClassName(item) : 'hover:bg-[#1e3a5f]/10'}`}>
                  {onDeleteMany && (
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        aria-label="Selecionar linha"
                        checked={selecionados.includes(item[idKey])}
                        onChange={() => toggleSelecionarLinha(item[idKey])}
                        className="w-4 h-4 rounded bg-[#0a0e1a] border-[#1e3a5f] text-blue-600 focus:ring-blue-500/50 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col, idx) => (
                    <td key={idx} className={`p-4 ${col.tdClassName || ''}`}>
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
          <nav aria-label="Paginação" className="p-4 border-t border-[#1e3a5f] flex items-center justify-between">
            <span className="text-sm text-slate-400 tabular-nums">
              Mostrando {fmt.format(indexInicio + 1)} até {fmt.format(Math.min(indexInicio + itensPorPagina, dadosFiltrados.length))} de {fmt.format(dadosFiltrados.length)} registros
            </span>

            <div className="flex items-center gap-1">
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
                  // Lógica simples para mostrar 5 páginas no máximo perto da atual
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
