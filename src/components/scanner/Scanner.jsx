import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAudio } from '../../hooks/useAudio'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../ui/ToastContainer'
import { ProductModal } from './ProductModal'
import * as XLSX from 'xlsx'
import {
  Barcode, Hash, Package, Lock, Unlock, Download,
  CheckCircle2, XCircle, RotateCcw, Loader2, Pencil, Trash2, Check, X,
} from 'lucide-react'

// ─── Constantes de fase ───────────────────────────────────────────────────────
const PHASE = { EAN: 'ean', QTY: 'qty', SN: 'sn' }
const HISTORY_LIMIT = 50

// Mensagem de erro se o valor lido não pode ser um serial; null se estiver ok.
function validarSn(sn, ean, eansConhecidos) {
  if (sn === ean || eansConhecidos.has(sn)) {
    return `"${sn}" é um EAN, não um S/N. Bipe o serial do equipamento.`
  }
  if (ean.length >= 8 && sn.includes(ean)) {
    return `Leitura inválida: o código contém o EAN (${ean}).`
  }
  const meio = sn.length / 2
  if (sn.length >= 8 && Number.isInteger(meio) && sn.slice(0, meio) === sn.slice(meio)) {
    return `Leitura duplicada (código repetido): ${sn}`
  }
  return null
}

export function Scanner({ session, onReset }) {
  const { playSuccess, playError } = useAudio()
  const { toasts, addToast } = useToast()

  // ── Estados ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState(PHASE.EAN)
  const [eanValue, setEanValue] = useState('')
  const [snValue, setSnValue] = useState('')
  const [qtyValue, setQtyValue] = useState('')
  const [lockedProduct, setLockedProduct] = useState(null)   // { ean, nome }
  const [expectedQty, setExpectedQty] = useState(0)
  const [readCount, setReadCount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [productModal, setProductModal] = useState(null)     // ean pendente de cadastro
  const [modalLoading, setModalLoading] = useState(false)
  const [history, setHistory] = useState([])                 // SNs salvos: { id, sn, time }
  const [pendingCount, setPendingCount] = useState(0)        // bipes na fila de gravação
  const [editing, setEditing] = useState(null)               // { id, value }
  const [editSaving, setEditSaving] = useState(false)
  const [produtosCadastrados, setProdutosCadastrados] = useState([]) // Para escolha manual

  // ── Buscar produtos ao montar ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchProdutos() {
      const { data } = await supabase.from('produtos').select('ean, nome').order('nome')
      if (data) setProdutosCadastrados(data)
    }
    fetchProdutos()
  }, [])

  const eansConhecidos = useMemo(() => new Set(produtosCadastrados.map(p => p.ean)), [produtosCadastrados])

  // ── Refs para foco ─────────────────────────────────────────────────────────
  const eanRef = useRef(null)
  const qtyRef = useRef(null)
  const snRef  = useRef(null)
  const queueRef = useRef([])
  const workingRef = useRef(false)

  // ── Foco automático por fase ───────────────────────────────────────────────
  useEffect(() => {
    if (phase === PHASE.EAN) { setTimeout(() => eanRef.current?.focus(), 50) }
    if (phase === PHASE.QTY) { setTimeout(() => qtyRef.current?.focus(), 50) }
    if (phase === PHASE.SN)  { setTimeout(() => snRef.current?.focus(),  50) }
  }, [phase])

  // ── Atalhos Globais ────────────────────────────────────────────────────────
  useEffect(() => {
    function handleGlobalKey(e) {
      if (e.key === 'F2') {
        e.preventDefault()
        unlockEan()
      }
      if (e.key === 'F10') {
        e.preventDefault()
        onReset()
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [onReset])

  // ── Destravar / Resetar ────────────────────────────────────────────────────
  function unlockEan() {
    setPhase(PHASE.EAN)
    setEanValue('')
    setSnValue('')
    setQtyValue('')
    setLockedProduct(null)
    setExpectedQty(0)
    setReadCount(0)
    setHistory([])
    setEditing(null)
    queueRef.current = []
    setPendingCount(0)
    setProductModal(null)
  }

  // ── EAN — leitura ──────────────────────────────────────────────────────────
  async function handleEanEnter(rawValue) {
    const ean = (rawValue ?? eanValue).trim()
    if (!ean || processing) return

    // Produtos já estão em memória: evita ida ao banco
    const local = produtosCadastrados.find(p => p.ean === ean)
    if (local) {
      lockProduct(local)
      return
    }

    setProcessing(true)

    const { data, error } = await supabase
      .from('produtos')
      .select('ean, nome')
      .eq('ean', ean)
      .maybeSingle()

    if (error) {
      addToast({ type: 'error', message: `Erro ao buscar produto: ${error.message}` })
      setProcessing(false)
      return
    }

    if (!data) {
      // Produto não existe → abre modal
      setProductModal(ean)
      setProcessing(false)
      return
    }

    // Produto encontrado → trava
    lockProduct(data)
    setProcessing(false)
  }

  function lockProduct(product) {
    setLockedProduct(product)
    setReadCount(0)
    setHistory([])
    setPhase(PHASE.QTY)
  }

  // ── Modal: cadastrar produto ───────────────────────────────────────────────
  async function handleProductConfirm(nome) {
    setModalLoading(true)
    const ean = productModal

    const { data, error } = await supabase
      .from('produtos')
      .insert({ ean, nome })
      .select()
      .single()

    if (error) {
      addToast({ type: 'error', message: `Erro ao cadastrar: ${error.message}` })
      setModalLoading(false)
      return
    }

    setProductModal(null)
    setModalLoading(false)
    addToast({ type: 'success', message: `Produto cadastrado: ${nome}` })
    lockProduct(data)
  }

  // ── QTY — confirmar quantidade ─────────────────────────────────────────────
  function handleQtyEnter() {
    const qty = parseInt(qtyValue, 10)
    if (!qty || qty < 1) {
      addToast({ type: 'warning', message: 'Digite uma quantidade válida.' })
      return
    }
    setExpectedQty(qty)
    setPhase(PHASE.SN)
  }

  // ── SN — bipagem em loop ───────────────────────────────────────────────────
  // O input é limpo na hora do Enter e a gravação roda numa fila: um bipe feito
  // enquanto o anterior ainda grava não se concatena com ele.
  function handleSnEnter(rawValue) {
    const sn = (rawValue ?? snValue).trim()
    setSnValue('')
    if (!sn) return

    const erro = validarSn(sn, lockedProduct.ean, eansConhecidos)
    if (erro) {
      playError()
      addToast({ type: 'error', message: erro, duration: 4000 })
      return
    }

    queueRef.current.push({ sn, ean: lockedProduct.ean, projetoId: session.projetoId })
    setPendingCount(queueRef.current.length)
    processQueue()
  }

  async function processQueue() {
    if (workingRef.current) return
    workingRef.current = true

    while (queueRef.current.length > 0) {
      const item = queueRef.current[0]

      // Uma ida ao banco só: o índice único (projeto_id, sn) já barra duplicata
      const { data, error } = await supabase
        .from('equipamentos')
        .insert({ projeto_id: item.projetoId, ean: item.ean, sn: item.sn })
        .select('id')
        .single()

      queueRef.current.shift()
      setPendingCount(queueRef.current.length)

      if (error) {
        playError()
        addToast({ type: 'error', message: mensagemErroSn(error, item.sn), duration: 4000 })
        continue
      }

      playSuccess()
      setReadCount(c => c + 1)
      setHistory(prev => [
        { id: data.id, sn: item.sn, time: new Date().toLocaleTimeString('pt-BR') },
        ...prev,
      ].slice(0, HISTORY_LIMIT))
    }

    workingRef.current = false
    setTimeout(() => snRef.current?.focus(), 30)
  }

  function mensagemErroSn(error, sn) {
    if (error.code === '23505') return `⚠ SN DUPLICADO: ${sn}`
    if (error.code === '23514') return `"${sn}" é um EAN, não um S/N.`
    return `Erro ao salvar ${sn}: ${error.message}`
  }

  // ── Editar / excluir um serial já bipado ───────────────────────────────────
  async function handleEditSave() {
    if (!editing || editSaving) return
    const novo = editing.value.trim()
    const atual = history.find(h => h.id === editing.id)
    if (!novo || novo === atual?.sn) {
      setEditing(null)
      return
    }

    const erro = validarSn(novo, lockedProduct.ean, eansConhecidos)
    if (erro) {
      addToast({ type: 'error', message: erro, duration: 4000 })
      return
    }

    setEditSaving(true)
    const { error } = await supabase.from('equipamentos').update({ sn: novo }).eq('id', editing.id)
    setEditSaving(false)

    if (error) {
      playError()
      addToast({ type: 'error', message: mensagemErroSn(error, novo), duration: 4000 })
      return
    }

    setHistory(prev => prev.map(h => h.id === editing.id ? { ...h, sn: novo } : h))
    setEditing(null)
    addToast({ type: 'success', message: `S/N corrigido: ${novo}` })
    setTimeout(() => snRef.current?.focus(), 30)
  }

  async function handleDeleteSn(item) {
    if (!window.confirm(`Excluir o S/N ${item.sn}?`)) return
    const { error } = await supabase.from('equipamentos').delete().eq('id', item.id)
    if (error) {
      addToast({ type: 'error', message: `Erro ao excluir: ${error.message}` })
      return
    }
    setHistory(prev => prev.filter(h => h.id !== item.id))
    setReadCount(c => Math.max(0, c - 1))
    if (editing?.id === item.id) setEditing(null)
    addToast({ type: 'success', message: `S/N excluído: ${item.sn}` })
    setTimeout(() => snRef.current?.focus(), 30)
  }

  // Aviso quando a caixa atinge a quantidade esperada
  useEffect(() => {
    if (expectedQty > 0 && readCount === expectedQty) {
      addToast({ type: 'success', message: `✅ Caixa completa! ${readCount}/${expectedQty} bipados.`, duration: 4000 })
    }
  }, [readCount, expectedQty, addToast])

  // ── Enter handler genérico ─────────────────────────────────────────────────
  // Repassa o valor real do input (e não o state) para não perder caracteres
  // de um leitor que digita mais rápido que o React renderiza.
  function handleKeyDown(e, handler) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handler(e.currentTarget.value)
    }
  }

  // ── Exportar XLSX ──────────────────────────────────────────────────────────
  const exportXlsx = useCallback(async () => {
    setExporting(true)
    const { data, error } = await supabase
      .from('equipamentos')
      .select('id, sn, ean, created_at, produtos(nome)')
      .eq('projeto_id', session.projetoId)
      .order('created_at', { ascending: true })

    if (error) {
      addToast({ type: 'error', message: `Erro ao exportar: ${error.message}` })
      setExporting(false)
      return
    }

    const rows = data.map(eq => ({
      EAN:         eq.ean,
      'Produto':   eq.produtos?.nome ?? '',
      'Serial':    eq.sn,
      'Data/Hora': new Date(eq.created_at).toLocaleString('pt-BR'),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 18 }, { wch: 35 }, { wch: 25 }, { wch: 22 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos')
    XLSX.writeFile(wb, `${session.projetoNome.replace(/\s+/g, '_')}_equipamentos.xlsx`)

    addToast({ type: 'success', message: `Planilha exportada com ${rows.length} registros.` })
    setExporting(false)
  }, [session, addToast])

  // ── Indicadores visuais ────────────────────────────────────────────────────
  const progress = expectedQty > 0 ? Math.min((readCount / expectedQty) * 100, 100) : 0
  const isComplete = expectedQty > 0 && readCount >= expectedQty
  const countColor = isComplete
    ? 'text-green-400'
    : readCount > 0
    ? 'text-blue-400'
    : 'text-slate-500'

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
      <ToastContainer toasts={toasts} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-[#111827] border-b border-[#1e3a5f] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
            <Barcode size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">WMS Scanner</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {session.clienteNome} <span className="text-blue-500">›</span> {session.projetoNome}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-exportar-xlsx"
            onClick={exportXlsx}
            disabled={exporting}
            className="
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
              bg-emerald-700/30 text-emerald-400 border border-emerald-700/40
              hover:bg-emerald-700/50 disabled:opacity-40 transition-all
            "
          >
            {exporting
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />}
            Exportar XLSX
          </button>
          <button
            id="btn-nova-sessao"
            onClick={onReset}
            className="
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
              bg-slate-700/40 text-slate-300 border border-slate-700
              hover:bg-slate-700/60 transition-all
            "
          >
            <RotateCcw size={14} /> Finalizar Bipagem (F10)
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
              /* ── Input EAN ── */
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Barcode size={16} className="text-blue-400" />
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Leia o EAN da Caixa</p>
                </div>
                <input
                  id="input-ean"
                  ref={eanRef}
                  type="text"
                  value={eanValue}
                  onChange={e => setEanValue(e.target.value)}
                  onKeyDown={e => handleKeyDown(e, handleEanEnter)}
                  placeholder="Aponte o leitor aqui..."
                  autoComplete="off"
                  className="
                    w-full px-5 py-5 rounded-xl bg-[#0f172a] border-2 border-blue-500/50
                    text-white placeholder-slate-600 text-3xl font-mono font-bold
                    focus:outline-none focus:border-blue-500 input-active
                    tracking-[0.2em] transition-all
                  "
                />
                {processing && (
                  <div className="flex items-center gap-2 mt-2 text-slate-400 text-xs">
                    <Loader2 size={12} className="animate-spin" /> Buscando produto...
                  </div>
                )}
                
                <div className="mt-6 flex flex-col gap-2">
                  <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider text-center">Ou escolha manualmente</span>
                  <select
                    onChange={(e) => {
                      const ean = e.target.value
                      if (!ean) return
                      const prod = produtosCadastrados.find(p => p.ean === ean)
                      if (prod) {
                         setEanValue(ean)
                         lockProduct(prod)
                      }
                    }}
                    value=""
                    className="w-full px-4 py-3 bg-[#0f172a] border border-[#1e3a5f] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer shadow-lg"
                  >
                    <option value="">-- Selecione um produto --</option>
                    {produtosCadastrados.map(p => (
                      <option key={p.ean} value={p.ean}>{p.nome} (EAN: {p.ean})</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* ── EAN Travado: Card visual ── */
              <div className="ean-locked-card rounded-xl p-4 border border-blue-700/50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock size={13} className="text-blue-400" />
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">EAN Travado</p>
                    </div>
                    <p className="font-mono text-blue-300 text-sm tracking-widest">{lockedProduct?.ean}</p>
                    <p className="text-white font-black text-2xl mt-1 leading-tight">{lockedProduct?.nome}</p>
                  </div>
                  <button
                    id="btn-destravar-ean"
                    onClick={unlockEan}
                    title="Destravar (F2)"
                    className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
                  >
                    <Unlock size={16} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3">Pressione F2 para ler um novo EAN</p>
              </div>
            )}
          </div>

          {/* Card QTY — só aparece na fase QTY */}
          {phase === PHASE.QTY && (
            <div className="bg-[#111827] border border-yellow-600/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-yellow-400" />
                <p className="text-sm font-bold text-yellow-300 uppercase tracking-widest">Quantidade Esperada da Caixa</p>
              </div>
              <input
                id="input-quantidade"
                ref={qtyRef}
                type="number"
                min="1"
                value={qtyValue}
                onChange={e => setQtyValue(e.target.value)}
                onKeyDown={e => handleKeyDown(e, () => handleQtyEnter())}
                placeholder="0"
                className="
                  w-full px-5 py-5 rounded-xl bg-[#0f172a] border-2 border-yellow-500/50
                  text-yellow-300 placeholder-slate-600 text-5xl font-black
                  focus:outline-none focus:border-yellow-400 input-active text-center
                  transition-all
                "
              />
              <p className="text-xs text-slate-500 mt-2 text-center">Digite a quantidade e pressione Enter</p>
            </div>
          )}

          {/* Card SN — fase SN */}
          {phase === PHASE.SN && (
            <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-green-400" />
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Serial Number</p>
                </div>
                {pendingCount > 0 && (
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <Loader2 size={12} className="animate-spin" /> gravando{pendingCount > 1 ? ` (${pendingCount})` : ''}...
                  </div>
                )}
              </div>
              <input
                id="input-sn"
                ref={snRef}
                type="text"
                value={snValue}
                onChange={e => setSnValue(e.target.value)}
                onKeyDown={e => handleKeyDown(e, handleSnEnter)}
                placeholder="Bipe o SN..."
                autoComplete="off"
                className="
                  w-full px-5 py-5 rounded-xl bg-[#0f172a] border-2 border-green-500/50
                  text-white placeholder-slate-600 text-2xl font-mono font-bold
                  focus:outline-none focus:border-green-400 input-active
                  tracking-widest transition-all
                "
              />
            </div>
          )}

        </div>

        {/* ── Coluna Lateral (status + histórico) ───────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Contador */}
          <div className={`
            bg-[#111827] border rounded-2xl p-6 text-center
            ${isComplete ? 'border-green-500/50' : 'border-[#1e3a5f]'}
          `}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Progresso</p>
            <div className={`text-7xl font-black leading-none ${countColor}`}>
              {readCount}
            </div>
            {expectedQty > 0 && (
              <>
                <p className="text-slate-600 text-sm mt-1">de {expectedQty} esperados</p>
                {/* Barra de progresso */}
                <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {isComplete && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-green-400 font-bold text-sm">
                    <CheckCircle2 size={16} /> COMPLETO
                  </div>
                )}
              </>
            )}
          </div>

          {/* Último bipe */}
          {history[0] && (
            <div className="bg-[#111827] border border-green-800/40 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Último Bipe</p>
              <p className="font-mono text-green-300 font-bold text-lg break-all leading-snug">{history[0].sn}</p>
              <p className="text-slate-600 text-xs mt-1">{history[0].time}</p>
            </div>
          )}

          {/* Seriais bipados (editáveis) */}
          {history.length > 0 && (
            <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl p-4 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                Seriais Bipados ({history.length})
              </p>
              <ul className="space-y-1 max-h-[50vh] overflow-y-auto">
                {history.map(h => (
                  <li key={h.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800 last:border-0">
                    {editing?.id === h.id ? (
                      <>
                        <input
                          autoFocus
                          value={editing.value}
                          onChange={e => setEditing({ id: h.id, value: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleEditSave() }
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          disabled={editSaving}
                          className="flex-1 min-w-0 bg-[#0f172a] border border-blue-500 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
                        />
                        <button onClick={handleEditSave} disabled={editSaving} title="Salvar" className="p-1 text-emerald-400 hover:text-emerald-300">
                          {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button onClick={() => setEditing(null)} title="Cancelar" className="p-1 text-slate-500 hover:text-white">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <span className="font-mono text-slate-300 text-xs break-all">{h.sn}</span>
                          <span className="text-slate-600 text-xs ml-2">{h.time}</span>
                        </div>
                        <div className="flex items-center shrink-0">
                          <button onClick={() => setEditing({ id: h.id, value: h.sn })} title="Editar S/N" className="p-1 text-slate-500 hover:text-blue-400">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteSn(h)} title="Excluir S/N" className="p-1 text-slate-500 hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
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
                <p className="text-xs text-slate-400">Trocar de EAN / nova caixa</p>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1 rounded-lg bg-slate-700 border border-slate-600 font-mono text-sm text-white font-bold">F10</kbd>
                <p className="text-xs text-slate-400">Finalizar bipagem atual</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Modal produto ────────────────────────────────────────────────── */}
      {productModal && (
        <ProductModal
          ean={productModal}
          loading={modalLoading}
          onConfirm={handleProductConfirm}
          onClose={() => { setProductModal(null); setEanValue(''); setTimeout(() => eanRef.current?.focus(), 50) }}
        />
      )}
    </div>
  )
}
