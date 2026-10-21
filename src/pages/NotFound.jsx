import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFound() {
  useDocumentTitle('Página não encontrada')
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <p className="text-6xl font-black text-blue-500 tabular-nums">404</p>
      <h1 className="text-xl font-bold text-white mt-3">Página não encontrada</h1>
      <p className="text-sm text-slate-400 mt-1">O endereço não existe ou foi movido.</p>
      <div className="flex gap-3 mt-6">
        <Link to="/admin" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">
          Ir para o painel
        </Link>
        <Link to="/" className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors">
          Ir para o scanner
        </Link>
      </div>
    </div>
  )
}
