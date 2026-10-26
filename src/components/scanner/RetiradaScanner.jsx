import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAudio } from '../../hooks/useAudio'
import { useToast } from '../../hooks/useToast'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { ToastContainer } from '../ui/ToastContainer'
import {
  Barcode, Hash, Package, Lock, Unlock, List, Undo2,
  CheckCircle2, RotateCcw, Loader2, MinusCircle,
} from 'lucide-react'

// Mesmo fluxo do scanner (EAN → quantidade → S/N), mas cada leitura TIRA o item do projeto.
// A exclusão/atualização em equipamentos já entra na Auditoria.
const PHASE = { EAN: 'ean', QTY: 'qty', SN: 'sn' }
const HISTORY_LIMIT = 50
// Botão só com ícone: área clicável de 40x40px mesmo com o ícone pequeno
const BTN_ICONE = 'inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-lg transition-all'
const AVISO_HISTORICO = 'Este item tem histórico de retirada por técnico, que também será apagado. Continuar?'

export function RetiradaScanner() {
  const { id: projetoId } = useParams()
  const navigate = useNavigate()
  const { playSuccess, playError } = useAudio()
  const { toasts, addToast } = useToast()
  useDocumentTitle('Retirada')

  const [projeto, setProjeto] = useState(null)
  const [produtos, setProdutos] = useState([])                // { ean, nome, controla_sn }
  const [itens, setItens] = useState([])                      // equipamentos do projeto
  const [carregando, setCarregando] = useState(true)

  const [phase, setPhase] = useState(PHASE.EAN)
  const [eanValue, setEanValue] = useState('')
  const [qtyValue, setQtyValue] = useState('')
  const [snValue, setSnValue] = useState('')
  const [lockedEan, setLockedEan] = useState(null)
  const [expectedQty, setExpectedQty] = useState(0)
  const [readCount, setReadCount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)         // bipes na fila de retirada
  const [history, setHistory] = useState([])                  // S/Ns retirados: { id, sn, time, linha }

  const eanRef = useRef(null)
  const qtyRef = useRef(null)
  const snRef = useRef(null)
  const queueRef = useRef([])
  const workingRef = useRef(false)
  // Fonte da verdade para a fila de retirada, que roda fora do ciclo de render
  const itensRef = useRef([])

  function atualizarItens(fn) {
    itensRef.current = fn(itensRef.current)
    setItens(itensRef.current)
  }

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    let ativo = true
    async function carregar() {
      const [resProj, resEquip, resProd] = await Promise.all([
        supabase.from('projetos').select('nome, clientes(nome)').eq('id', projetoId).single(),
        supabase
          .from('equipamentos')
          .select('id, ean, sn, quantidade, n_patrimonio, created_at, alocacao_equipamentos(id)')
          .eq('projeto_id', projetoId),
        supabase.from('produtos').select('ean, nome, controla_sn'),
      ])
      if (!ativo) return
      if (resProj.error || resEquip.error || resProd.error) {
        addToast({ type: 'error', message: 'Erro ao carregar o projeto.', duration: 4000 })
      }
      if (resProj.data) setProjeto(resProj.data)
      if (resProd.data) setProdutos(resProd.data)
      itensRef.current = resEquip.data || []
      setItens(itensRef.current)
      setCarregando(false)
    }
    carregar()
    return () => { ativo = false }
  }, [projetoId, addToast])

  // Produtos que o projeto tem, com a quantidade disponível para retirar
  const produtosNoProjeto = useMemo(() => {
    const porEan = {}
    for (const eq of itens) {
      const prod = produtos.find(p => p.ean === eq.ean)
      porEan[eq.ean] ??= {
        ean: eq.ean,
        nome: prod?.nome || 'Desconhecido',
        semSn: prod?.controla_sn === false,
        disponivel: 0,
      }
      porEan[eq.ean].disponivel += eq.quantidade || 1
    }
    return Object.values(porEan).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [itens, produtos])

  const eansDoProjeto = useMemo(() => new Set(produtosNoProjeto.map(p => p.ean)), [produtosNoProjeto])
  const produtoAtual = produtosNoProjeto.find(p => p.ean === lockedEan) || null

  // ── Foco automático por fase ───────────────────────────────────────────────
  useEffect(() => {
    if (phase === PHASE.EAN) setTimeout(() => eanRef.current?.focus(), 50)
    if (phase === PHASE.QTY) setTimeout(() => qtyRef.current?.focus(), 50)
    if (phase === PHASE.SN) setTimeout(() => snRef.current?.focus(), 50)
  }, [phase, carregando])

  // ── Atalhos Globais ────────────────────────────────────────────────────────
  useEffect(() => {
    function handleGlobalKey(e) {
      if (e.key === 'F2') {
        e.preventDefault()
        unlockEan()
      }
      if (e.key === 'F10') {
        e.preventDefault()
        navigate(`/admin/projetos/${projetoId}`)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [navigate, projetoId])

  function unlockEan() {
    setPhase(PHASE.EAN)
    setEanValue('')
    setQtyValue('')
    setSnValue('')
    setLockedEan(null)
    setExpectedQty(0)
    setReadCount(0)
    setHistory([])
    queueRef.current = []
    setPendingCount(0)
  }

  function lockProduct(ean) {
    setLockedEan(ean)
    setReadCount(0)
    setHistory([])
    setQtyValue('')
    setPhase(PHASE.QTY)
  }

  // ── EAN — leitura ──────────────────────────────────────────────────────────
  function handleEanEnter(rawValue) {
    const ean = (rawValue ?? eanValue).trim()
    if (!ean || processing) return

    if (!eansDoProjeto.has(ean)) {
      const nome = produtos.find(p => p.ean === ean)?.nome
      playError()
      addToast({
        type: 'error',
        message: nome ? `"${nome}" não está neste projeto.` : `EAN ${ean} não está neste projeto.`,
        duration: 4000,
      })
      setEanValue('')
      return
    }
    lockProduct(ean)
  }

  // ── QTY — quantidade a retirar ─────────────────────────────────────────────
  async function handleQtyEnter() {
    if (processing) return
    const qty = parseInt(qtyValue, 10)
    if (!qty || qty < 1) {
      addToast({ type: 'warning', message: 'Digite uma quantidade válida.' })
      return
    }
    if (qty > produtoAtual.disponivel) {
      playError()
      addToast({ type: 'error', message: `O projeto tem apenas ${produtoAtual.disponivel} unidade(s) deste produto.`, duration: 4000 })
      return
    }

    // Produto sem S/N: não há o que bipar, a retirada é direto pela quantidade
    if (produtoAtual.semSn) {
      await retirarQuantidade(produtoAtual, qty)
      return
    }
    setExpectedQty(qty)
    setPhase(PHASE.SN)
  }

  async function retirarQuantidade(produto, qty) {
    const linha = itensRef.current.find(eq => eq.ean === produto.ean && !eq.sn)
    if (!linha) return
    const retirarTudo = qty >= linha.quantidade
    if (retirarTudo && linha.alocacao_equipamentos?.length > 0 && !window.confirm(AVISO_HISTORICO)) return

    setProcessing(true)
    const consulta = supabase.from('equipamentos')
    const { data, error } = await (retirarTudo
      ? consulta.delete().eq('id', linha.id)
      : consulta.update({ quantidade: linha.quantidade - qty }).eq('id', linha.id)
    ).select('id')
    setProcessing(false)

    if (error || !data?.length) {
      playError()
      addToast({ type: 'error', message: error ? `Erro ao retirar: ${error.message}` : 'Este item já não está no projeto.', duration: 4000 })
      return
    }

    atualizarItens(lista => retirarTudo
      ? lista.filter(eq => eq.id !== linha.id)
      : lista.map(eq => eq.id === linha.id ? { ...eq, quantidade: eq.quantidade - qty } : eq))
    playSuccess()
    addToast({ type: 'success', message: `Retirado: ${qty} × ${produto.nome}`, duration: 4000 })
    unlockEan()
  }

  // ── SN — bipagem em loop ───────────────────────────────────────────────────
  // O input é limpo na hora do Enter e a retirada roda numa fila: um bipe feito
  // enquanto o anterior ainda grava não se concatena com ele.
  function handleSnEnter(rawValue) {
    const sn = (rawValue ?? snValue).trim()
    setSnValue('')
    if (!sn) return

    if (sn === lockedEan || eansDoProjeto.has(sn)) {
      playError()
      addToast({ type: 'error', message: `"${sn}" é um EAN, não um S/N. Bipe o serial do equipamento.`, duration: 4000 })
      return
    }

    queueRef.current.push({ sn, ean: lockedEan })
    setPendingCount(queueRef.current.length)
    processQueue()
  }

  async function processQueue() {
    if (workingRef.current) return
    workingRef.current = true

    while (queueRef.current.length > 0) {
      await retirarSn(queueRef.current[0])
      queueRef.current.shift()
      setPendingCount(queueRef.current.length)
    }

    workingRef.current = false
    setTimeout(() => snRef.current?.focus(), 30)
  }

  async function retirarSn({ sn, ean }) {
    const minusculo = sn.toLowerCase()
    const linha = itensRef.current.find(eq => eq.sn?.toLowerCase() === minusculo)

    if (!linha) {
      playError()
      addToast({ type: 'error', message: `⚠ S/N ${sn} não está neste projeto.`, duration: 4000 })
      return
    }
    if (linha.ean !== ean) {
      const nome = produtos.find(p => p.ean === linha.ean)?.nome || linha.ean
      playError()
      addToast({ type: 'error', message: `S/N ${sn} é de outro produto (${nome}).`, duration: 4000 })
      return
    }
    if (linha.alocacao_equipamentos?.length > 0 && !window.confirm(AVISO_HISTORICO)) return

    const { data, error } = await supabase.from('equipamentos').delete().eq('id', linha.id).select('id')
    if (error) {
      playError()
      addToast({ type: 'error', message: `Erro ao retirar ${sn}: ${error.message}`, duration: 4000 })
      return
    }

    atualizarItens(lista => lista.filter(eq => eq.id !== linha.id))
    if (!data?.length) {
      // Outra pessoa já tinha tirado: a lista local é que estava desatualizada
      playError()
      addToast({ type: 'warning', message: `S/N ${sn} já tinha sido retirado.`, duration: 4000 })
      return
    }

    playSuccess()
    setReadCount(c => c + 1)
    setHistory(prev => [
      { id: linha.id, sn: linha.sn, time: new Date().toLocaleTimeString('pt-BR'), linha },
      ...prev,
    ].slice(0, HISTORY_LIMIT))
  }

  // ── Desfazer: devolve ao projeto um S/N retirado por engano ───────────────
  async function handleDesfazer(item) {
    const { linha } = item
    const { error } = await supabase.from('equipamentos').insert({
      id: linha.id,
      projeto_id: projetoId,
      ean: linha.ean,
      sn: linha.sn,
      quantidade: linha.quantidade,
      n_patrimonio: linha.n_patrimonio,
      created_at: linha.created_at,
    })
    if (error) {
      playError()
      addToast({ type: 'error', message: `Erro ao desfazer: ${error.message}`, duration: 4000 })
      return
    }
    atualizarItens(lista => [...lista, { ...linha, alocacao_equipamentos: [] }])
    setHistory(prev => prev.filter(h => h.id !== item.id))
    setReadCount(c => Math.max(0, c - 1))
    addToast({ type: 'success', message: `S/N devolvido ao projeto: ${item.sn}` })
    setTimeout(() => snRef.current?.focus(), 30)
  }

  // Aviso quando a retirada atinge a quantidade esperada
  useEffect(() => {
    if (expectedQty > 0 && readCount === expectedQty) {
      addToast({ type: 'success', message: `✅ Retirada completa! ${readCount}/${expectedQty} retirados.`, duration: 4000 })
    }
  }, [readCount, expectedQty, addToast])

  // Repassa o valor real do input (e não o state) para não perder caracteres
  // de um leitor que digita mais rápido que o React renderiza.
  function handleKeyDown(e, handler) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handler(e.currentTarget.value)
    }
  }

  // ── Indicadores visuais ────────────────────────────────────────────────────
  const progress = expectedQty > 0 ? Math.min((readCount / expectedQty) * 100, 100) : 0
  const isComplete = expectedQty > 0 && readCount >= expectedQty
  const countColor = isComplete ? 'text-green-400' : readCount > 0 ? 'text-red-400' : 'text-slate-400'
  const voltarHref = `/admin/projetos/${projetoId}`

  if (carregando) {
    return (
      <div role="status" className="min-h-screen bg-[#0a0e1a] flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin" aria-hidden="true" /> Carregando…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
      <ToastContainer toasts={toasts} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-[#111827] border-b border-[#1e3a5f] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-600/20 text-red-400">
            <MinusCircle size={18} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">Retirada do Projeto</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {projeto?.clientes?.nome} <span className="text-red-500">›</span> {projeto?.nome}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={voltarHref}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-700/20 text-blue-300 border border-blue-700/40 hover:bg-blue-700/40 transition-all"
          >
            <List size={14} aria-hidden="true" /> Itens do projeto
          </Link>
          <button
            onClick={() => navigate(voltarHref)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-700/40 text-slate-300 border border-slate-700 hover:bg-slate-700/60 transition-all"
          >
            <RotateCcw size={14} aria-hidden="true" /> Finalizar Retirada (F10)
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">

        {/* ── Coluna Central (principal) ────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Card EAN / Produto Travado */}
          <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl p-5">
            {phase === PHASE.EAN ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Barcode size={16} className="text-red-400" aria-hidden="true" />
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Leia o EAN do produto a retirar</p>
                </div>
                <input
                  id="input-ean"
                  ref={eanRef}
                  type="text"
                  name="ean"
                  aria-label="EAN do produto a retirar"
                  value={eanValue}
                  onChange={e => setEanValue(e.target.value)}
                  onKeyDown={e => handleKeyDown(e, handleEanEnter)}
                  placeholder="Aponte o leitor aqui…"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="
                    w-full px-5 py-5 rounded-xl bg-[#0f172a] border-2 border-red-500/50
                    text-white placeholder-slate-600 text-3xl font-mono font-bold
                    focus:outline-none focus:border-red-500 input-active
                    tracking-[0.2em] transition-all
                  "
                />

                <div className="mt-6 flex flex-col gap-2">
                  <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider text-center">Ou escolha manualmente</span>
                  <select
                    aria-label="Escolher produto manualmente"
                    onChange={e => e.target.value && lockProduct(e.target.value)}
                    value=""
                    className="w-full px-4 py-3 bg-[#0f172a] border border-[#1e3a5f] rounded-xl text-white text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 cursor-pointer shadow-lg"
                  >
                    <option value="">
                      {produtosNoProjeto.length ? '-- Selecione um produto do projeto --' : 'Este projeto não tem produtos'}
                    </option>
                    {produtosNoProjeto.map(p => (
                      <option key={p.ean} value={p.ean}>{p.nome} (EAN: {p.ean}) — {p.disponivel} un.</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="ean-locked-card rounded-xl p-4 border border-red-700/50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock size={13} className="text-red-400" aria-hidden="true" />
                      <p className="text-xs font-bold text-red-400 uppercase tracking-widest">EAN Travado</p>
                    </div>
                    <p className="font-mono text-red-300 text-sm tracking-widest">{lockedEan}</p>
                    <p className="text-white font-black text-2xl mt-1 leading-tight">{produtoAtual?.nome}</p>
                    <p className="text-xs text-slate-400 mt-1 tabular-nums">
                      {produtoAtual?.disponivel ?? 0} unidade(s) no projeto
                    </p>
                  </div>
                  <button
                    onClick={unlockEan}
                    title="Destravar (F2)" aria-label="Destravar (F2)"
                    className={`${BTN_ICONE} bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white`}
                  >
                    <Unlock size={16} aria-hidden="true" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-3">Pressione F2 para ler outro EAN</p>
              </div>
            )}
          </div>

          {/* Card QTY */}
          {phase === PHASE.QTY && (
            <div className="bg-[#111827] border border-yellow-600/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-yellow-400" aria-hidden="true" />
                <p className="text-sm font-bold text-yellow-300 uppercase tracking-widest">Quantidade a Retirar</p>
              </div>
              <input
                id="input-quantidade"
                ref={qtyRef}
                aria-label="Quantidade a retirar"
                type="number"
                inputMode="numeric"
                name="quantidade"
                autoComplete="off"
                min="1"
                max={produtoAtual?.disponivel}
                value={qtyValue}
                onChange={e => setQtyValue(e.target.value)}
                onKeyDown={e => handleKeyDown(e, () => handleQtyEnter())}
                disabled={processing}
                placeholder="0"
                className="
                  w-full px-5 py-5 rounded-xl bg-[#0f172a] border-2 border-yellow-500/50
                  text-yellow-300 placeholder-slate-600 text-5xl font-black
                  focus:outline-none focus:border-yellow-400 input-active text-center
                  transition-all disabled:opacity-60
                "
              />
              <p className="text-xs text-slate-400 mt-2 text-center">
                {produtoAtual?.semSn
                  ? 'Este produto não tem S/N: a quantidade é retirada direto. Digite e pressione Enter.'
                  : 'Digite a quantidade e pressione Enter. Depois, bipe o S/N de cada item.'}
              </p>
            </div>
          )}

          {/* Card SN */}
          {phase === PHASE.SN && (
            <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-3">
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-red-400" aria-hidden="true" />
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Serial Number a Retirar</p>
                </div>
                <span aria-live="polite">
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs tabular-nums">
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" /> retirando{pendingCount > 1 ? ` (${pendingCount})` : ''}…
                    </span>
                  )}
                </span>
              </div>
              <input
                id="input-sn"
                ref={snRef}
                type="text"
                name="sn"
                aria-label="Número de série a retirar"
                value={snValue}
                onChange={e => setSnValue(e.target.value)}
                onKeyDown={e => handleKeyDown(e, handleSnEnter)}
                placeholder="Bipe o SN…"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="
                  w-full px-5 py-5 rounded-xl bg-[#0f172a] border-2 border-red-500/50
                  text-white placeholder-slate-600 text-2xl font-mono font-bold
                  focus:outline-none focus:border-red-400 input-active
                  tracking-widest transition-all
                "
              />
            </div>
          )}
        </div>

        {/* ── Coluna Lateral (status + histórico) ───────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Contador */}
          <div className={`bg-[#111827] border rounded-2xl p-6 text-center ${isComplete ? 'border-green-500/50' : 'border-[#1e3a5f]'}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Retirados</p>
            <div className={`text-7xl font-black leading-none tabular-nums ${countColor}`}>
              {readCount}
            </div>
            {expectedQty > 0 && (
              <>
                <p className="text-slate-400 text-sm mt-1 tabular-nums">de {expectedQty} a retirar</p>
                <div
                  role="progressbar"
                  aria-label="Progresso da retirada"
                  aria-valuemin={0}
                  aria-valuemax={expectedQty}
                  aria-valuenow={Math.min(readCount, expectedQty)}
                  className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {isComplete && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-green-400 font-bold text-sm">
                    <CheckCircle2 size={16} aria-hidden="true" /> COMPLETO
                  </div>
                )}
              </>
            )}
          </div>

          {/* Seriais retirados (com desfazer) */}
          {history.length > 0 && (
            <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl p-4 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Seriais Retirados (<span className="tabular-nums">{history.length}</span>)
              </p>
              <ul className="space-y-1 max-h-[50vh] overflow-y-auto">
                {history.map(h => (
                  <li key={h.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800 last:border-0">
                    <div className="min-w-0">
                      <span className="font-mono text-slate-300 text-xs break-all">{h.sn}</span>
                      <span className="text-slate-400 text-xs ml-2 tabular-nums">{h.time}</span>
                    </div>
                    {!(h.linha.alocacao_equipamentos?.length > 0) && (
                      <button
                        onClick={() => handleDesfazer(h)}
                        title="Desfazer: devolver ao projeto" aria-label="Desfazer: devolver ao projeto"
                        className={`${BTN_ICONE} text-slate-400 hover:text-emerald-400`}
                      >
                        <Undo2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instrução F2 e F10 */}
          {phase === PHASE.SN && (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1 rounded-lg bg-slate-700 border border-slate-600 font-mono text-sm text-white font-bold">F2</kbd>
                <p className="text-xs text-slate-400">Trocar de EAN / outro produto</p>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1 rounded-lg bg-slate-700 border border-slate-600 font-mono text-sm text-white font-bold">F10</kbd>
                <p className="text-xs text-slate-400">Finalizar retirada</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
