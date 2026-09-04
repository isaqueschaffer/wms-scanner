import { useState } from 'react'
import { Package, X, Loader2 } from 'lucide-react'

/**
 * Modal para cadastrar um novo produto quando o EAN não existe no banco.
 */
export function ProductModal({ ean, onConfirm, onClose, loading }) {
  const [name, setName] = useState('')

  function handleKey(e) {
    if (e.key === 'Enter' && name.trim()) {
      e.preventDefault()
      onConfirm(name.trim())
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Produto não encontrado</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cadastre o nome para este EAN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* EAN badge */}
        <div className="mb-4 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">EAN lido</p>
          <p className="font-mono font-bold text-blue-400 text-lg tracking-widest">{ean}</p>
        </div>

        {/* Input nome */}
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          Nome do produto
        </label>
        <input
          id="product-name-input"
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ex: Bobina Fibra 48FO APC..."
          className="
            w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f]
            text-white placeholder-slate-600 text-sm font-medium
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30
            transition-all
          "
        />

        <p className="text-xs text-slate-500 mt-2">Pressione Enter para confirmar ou Esc para cancelar</p>

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim() || loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  )
}
