import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-react'

export function DataTable({
  data = [],
  columns = [],
  searchKeys = [],
  dateKey = null,
  idKey = 'id',
  onDeleteMany = null,
  emptyMessage = 'Nenhum registro encontrado.'
}) {
  const [busca, setBusca] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [itensPorPagina, setItensPorPagina] = useState(25)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [selecionados, setSelecionados] = useState([])

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

  // Resetar pagina ao mudar os filtros
  useMemo(() => {
    setPaginaAtual(1)
  }, [busca, dataInicio, dataFim, itensPorPagina])

  // 2. Paginação
  const totalPaginas = Math.ceil(dadosFiltrados.length / itensPorPagina)
  const indexInicio = (paginaAtual - 1) * itensPorPagina
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

  return (
    <div className="space-y-4">
      {/* Controles de Filtro e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Barra de Busca */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#111827] border border-[#1e3a5f] rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filtro de Data */}
        {dateKey && (
          <div className="flex items-center gap-2 bg-[#111827] border border-[#1e3a5f] rounded-xl px-3 py-1.5 h-[50px] w-full md:w-auto">
            <Calendar size={18} className="text-slate-500 shrink-0" />
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-transparent text-slate-300 text-sm focus:outline-none focus:text-white"
            />
            <span className="text-slate-500 text-sm">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-transparent text-slate-300 text-sm focus:outline-none focus:text-white"
            />
          </div>
        )}
      </div>

      {/* Ações em Lote (Bulk) */}
      <div className="flex items-center justify-between min-h-[40px]">
        {onDeleteMany && selecionados.length > 0 ? (
          <button
            onClick={handleExcluirSelecionados}
            className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-all border border-red-500/30"
          >
            <Trash2 size={16} />
            Excluir {selecionados.length} {selecionados.length === 1 ? 'selecionado' : 'selecionados'}
          </button>
        ) : <div />} {/* Espaçador vazio */}
        
        {/* Seletor de Itens por Página */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Exibir:</span>
          <select
            value={itensPorPagina}
            onChange={(e) => setItensPorPagina(Number(e.target.value))}
            className="bg-[#111827] border border-[#1e3a5f] rounded-lg px-2 py-1 text-white focus:outline-none"
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0f172a] border-b border-[#1e3a5f]">
              {onDeleteMany && (
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selecionados.length === dadosPaginados.length && dadosPaginados.length > 0}
                    onChange={toggleSelecionarTudo}
                    className="w-4 h-4 rounded bg-[#0a0e1a] border-[#1e3a5f] text-blue-600 focus:ring-blue-500/50 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th key={idx} className={`p-4 text-xs font-bold uppercase tracking-widest text-slate-400 ${col.className || ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dadosPaginados.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onDeleteMany ? 1 : 0)} className="p-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              dadosPaginados.map((item, index) => (
                <tr key={item[idKey] || index} className="border-b border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/10 transition-colors">
                  {onDeleteMany && (
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
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
          <div className="p-4 border-t border-[#1e3a5f] flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Mostrando {indexInicio + 1} até {Math.min(indexInicio + itensPorPagina, dadosFiltrados.length)} de {dadosFiltrados.length} registros
            </span>
            
            <div className="flex items-center gap-1">
              <button
                disabled={paginaAtual === 1}
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e3a5f]/50 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  // Lógica simples para mostrar 5 páginas no máximo perto da atual
                  let pageNum = paginaAtual - 2 + i;
                  if (paginaAtual <= 3) pageNum = i + 1;
                  else if (paginaAtual >= totalPaginas - 2) pageNum = totalPaginas - 4 + i;
                  
                  if (pageNum > 0 && pageNum <= totalPaginas) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPaginaAtual(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors ${
                          paginaAtual === pageNum
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
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e3a5f]/50 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
