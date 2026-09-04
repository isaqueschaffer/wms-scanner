import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAudio } from '../../hooks/useAudio'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../ui/ToastContainer'
import { ProductModal } from './ProductModal'
import * as XLSX from 'xlsx'
import {
  Barcode, Hash, Package, Lock, Unlock, Download,
  CheckCircle2, XCircle, RotateCcw, Loader2,
} from 'lucide-react'

// ─── Constantes de fase ───────────────────────────────────────────────────────
const PHASE = { EAN: 'ean', QTY: 'qty', SN: 'sn' }

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
  const [history, setHistory] = useState([])                 // últimas SNs lidas
  const [produtosCadastrados, setProdutosCadastrados] = useState([]) // Para escolha manual

  // ── Buscar produtos ao montar ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchProdutos() {
      const { data } = await supabase.from('produtos').select('ean, nome').order('nome')
      if (data) setProdutosCadastrados(data)
    }
    fetchProdutos()
  }, [])

  // ── Refs para foco ─────────────────────────────────────────────────────────
  const eanRef = useRef(null)
  const qtyRef = useRef(null)
  const snRef  = useRef(null)

  // ── Foco automático por fase ───────────────────────────────────────────────
  useEffect(() => {
    if (phase === PHASE.EAN) { setTimeout(() => eanRef.current?.focus(), 50) }
    if (phase === PHASE.QTY) { setTimeout(() => qtyRef.current?.focus(), 50) }
    if (phase === PHASE.SN)  { setTimeout(() => snRef.current?.focus(),  50) }
  }, [phase])

  // ── F2 para destravar EAN ──────────────────────────────────────────────────
  useEffect(() => {
    function handleGlobalKey(e) {
      if (e.key === 'F2') {
        e.preventDefault()
        unlockEan()
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

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
    setProductModal(null)
  }

  // ── EAN — leitura ──────────────────────────────────────────────────────────
  async function handleEanEnter() {
    const ean = eanValue.trim()
    if (!ean || processing) return
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
  async function handleSnEnter() {
    const sn = snValue.trim()
    if (!sn || processing) return
    setProcessing(true)

    // Verifica duplicata no projeto
    const { data: existing } = await supabase
      .from('equipamentos')
      .select('id')
      .eq('projeto_id', session.projetoId)
      .eq('sn', sn)
      .maybeSingle()

    if (existing) {
      playError()
      addToast({ type: 'error', message: `⚠ SN DUPLICADO: ${sn}` })
      setSnValue('')
      setProcessing(false)
      setTimeout(() => snRef.current?.focus(), 30)
      return
    }

    // Salva
    const { error } = await supabase
      .from('equipamentos')
      .insert({
        projeto_id: session.projetoId,
        ean: lockedProduct.ean,
        sn,
      })

    if (error) {
      playError()
      addToast({ type: 'error', message: `Erro ao salvar: ${error.message}` })
      setSnValue('')
      setProcessing(false)
      setTimeout(() => snRef.current?.focus(), 30)
      return
    }

    // Sucesso
    playSuccess()
    const newCount = readCount + 1
    setReadCount(newCount)
    setHistory(prev => [{ sn, time: new Date().toLocaleTimeString('pt-BR') }, ...prev].slice(0, 8))
    setSnValue('')
    setProcessing(false)
    setTimeout(() => snRef.current?.focus(), 30)

    // Atingiu quantidade esperada
    if (expectedQty > 0 && newCount >= expectedQty) {
      addToast({ type: 'success', message: `✅ Caixa completa! ${newCount}/${expectedQty} bipados.`, duration: 4000 })
    }
  }

  // ── Enter handler genérico ─────────────────────────────────────────────────
  function handleKeyDown(e, handler) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handler()
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
            <RotateCcw size={14} /> Nova Sessão
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
                onKeyDown={e => handleKeyDown(e, handleQtyEnter)}
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
                {processing && (
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <Loader2 size={12} className="animate-spin" /> verificando...
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

          {/* Histórico */}
          {history.length > 1 && (
            <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl p-4 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Histórico Recente</p>
              <ul className="space-y-2">
                {history.slice(1).map((h, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800 last:border-0">
                    <span className="font-mono text-slate-400 text-xs break-all">{h.sn}</span>
                    <span className="text-slate-600 text-xs shrink-0">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instrução F2 */}
          {phase === PHASE.SN && (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1 rounded-lg bg-slate-700 border border-slate-600 font-mono text-sm text-white font-bold">F2</kbd>
                <p className="text-xs text-slate-400">Trocar de EAN / nova caixa</p>
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
