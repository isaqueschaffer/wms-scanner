import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { normalizarBusca, soDigitos } from './opcoesBusca'

const LIMITE_RESULTADOS = 100


// Cada palavra digitada precisa aparecer em algum atributo (nome, CNPJ, cidade, código…).
// Números também casam ignorando pontuação: "12345678" acha "12.345.678/0001-90".
function casa(opcao, termos) {
  return termos.every(t => opcao._texto.includes(t.texto) || (t.digitos.length >= 3 && opcao._digitos.includes(t.digitos)))
}

/**
 * Select com pesquisa. Troca o <select> nativo quando a lista é grande (clientes, projetos…).
 *
 * options: [{ value, label, detalhe?, busca?: [textos extras pesquisáveis] }]
 * Funciona dentro de <Field>: o id recebido vai para o input.
 */
export function SearchSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Selecione…',
  disabled = false,
  required = false,
  className = '',
  wrapperClassName = '',
  ref,
  'aria-label': ariaLabel,
  vazio = 'Nada encontrado',
}) {
  const idPadrao = useId()
  const inputId = id ?? idPadrao
  const listaId = `${inputId}-lista`
  const inputRef = useRef(null)
  const listaRef = useRef(null)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [ativo, setAtivo] = useState(0)
  const [posicao, setPosicao] = useState(null)

  const indexadas = useMemo(() => (options ?? []).map(o => {
    const partes = [o.label, o.detalhe, ...(o.busca ?? [])].filter(Boolean)
    return { ...o, _texto: normalizarBusca(partes.join(' ')), _digitos: partes.map(soDigitos).join(' ') }
  }), [options])

  const selecionada = indexadas.find(o => String(o.value) === String(value))

  const filtradas = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean).map(t => ({ texto: t, digitos: soDigitos(t) }))
    if (termos.length === 0) return indexadas
    return indexadas.filter(o => casa(o, termos))
  }, [indexadas, busca])

  const visiveis = filtradas.slice(0, LIMITE_RESULTADOS)

  // Expõe o foco para quem passou ref (ex.: focar o projeto depois de escolher o cliente)
  useEffect(() => {
    if (!ref) return
    const api = { focus: () => inputRef.current?.focus() }
    if (typeof ref === 'function') { ref(api); return () => ref(null) }
    ref.current = api
  }, [ref])

  // A lista fica num portal com position fixed para não ser cortada pelo overflow do Modal
  useLayoutEffect(() => {
    if (!aberto) return
    function medir() {
      const r = inputRef.current?.getBoundingClientRect()
      if (!r) return
      const abaixo = window.innerHeight - r.bottom
      const paraCima = abaixo < 260 && r.top > abaixo
      setPosicao({
        left: r.left,
        width: r.width,
        top: paraCima ? undefined : r.bottom + 4,
        bottom: paraCima ? window.innerHeight - r.top + 4 : undefined,
        maxHeight: Math.max(160, Math.min(320, (paraCima ? r.top : abaixo) - 16)),
      })
    }
    medir()
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    listaRef.current?.querySelector(`[data-indice="${ativo}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [ativo, aberto])

  function abrir() {
    if (disabled) return
    setBusca('')
    setAtivo(Math.max(0, filtradas.findIndex(o => String(o.value) === String(value))))
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setBusca('')
  }

  function escolher(opcao) {
    onChange?.(opcao ? opcao.value : '')
    fechar()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!aberto) { abrir(); return }
      const passo = e.key === 'ArrowDown' ? 1 : -1
      setAtivo(a => Math.min(visiveis.length - 1, Math.max(0, a + passo)))
    } else if (e.key === 'Enter') {
      if (!aberto) return
      e.preventDefault()
      if (visiveis[ativo]) escolher(visiveis[ativo])
    } else if (e.key === 'Escape') {
      if (!aberto) return
      // Fecha só a lista, não o Modal em volta
      e.preventDefault()
      e.stopPropagation()
      fechar()
    } else if (e.key === 'Tab') {
      if (aberto) fechar()
    }
  }

  const textoInput = aberto ? busca : (selecionada?.label ?? '')

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={aberto && visiveis[ativo] ? `${listaId}-${ativo}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        required={required}
        value={textoInput}
        placeholder={aberto ? 'Digite para pesquisar…' : placeholder}
        onClick={() => { if (!aberto) abrir() }}
        onBlur={fechar}
        onChange={e => {
          // Fechado, o input mostra o nome escolhido: começa a busca só com o que foi digitado
          setBusca(aberto ? e.target.value : (e.nativeEvent.data ?? e.target.value))
          setAtivo(0)
          if (!aberto) setAberto(true)
        }}
        onKeyDown={onKeyDown}
        className={`${className} pr-16 cursor-text disabled:opacity-40 disabled:cursor-not-allowed`}
      />
      {name && <input type="hidden" name={name} value={value ?? ''} />}

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
        {selecionada && !disabled && !aberto && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={e => e.preventDefault()}
            onClick={() => escolher(null)}
            aria-label="Limpar seleção"
            title="Limpar seleção"
            className="p-1 rounded hover:text-white"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
        {aberto
          ? <Search size={16} aria-hidden="true" className="pointer-events-none" />
          : <ChevronDown size={16} aria-hidden="true" className="pointer-events-none" />}
      </div>

      {aberto && posicao && createPortal(
        <ul
          ref={listaRef}
          id={listaId}
          role="listbox"
          style={{ position: 'fixed', left: posicao.left, width: posicao.width, top: posicao.top, bottom: posicao.bottom, maxHeight: posicao.maxHeight }}
          className="z-[60] overflow-y-auto rounded-xl border border-[#1e3a5f] bg-[#0f172a] shadow-2xl py-1"
          onMouseDown={e => e.preventDefault()}
        >
          {visiveis.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-400">{vazio}</li>
          )}
          {visiveis.map((o, i) => {
            const marcada = String(o.value) === String(value)
            return (
              <li
                key={o.value}
                id={`${listaId}-${i}`}
                data-indice={i}
                role="option"
                aria-selected={marcada}
                onMouseEnter={() => setAtivo(i)}
                onClick={() => escolher(o)}
                className={`px-4 py-2 cursor-pointer text-sm ${i === ativo ? 'bg-blue-600/30' : ''} ${marcada ? 'text-blue-300 font-semibold' : 'text-white'}`}
              >
                <div className="truncate">{o.label}</div>
                {o.detalhe && <div className="truncate text-xs text-slate-400">{o.detalhe}</div>}
              </li>
            )
          })}
          {filtradas.length > LIMITE_RESULTADOS && (
            <li className="px-4 py-2 text-xs text-slate-400 border-t border-[#1e3a5f] tabular-nums">
              Mostrando {LIMITE_RESULTADOS} de {filtradas.length}. Digite mais para refinar.
            </li>
          )}
        </ul>,
        document.body
      )}
    </div>
  )
}
