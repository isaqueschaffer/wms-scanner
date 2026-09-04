import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react'
import { DataTable } from '../components/DataTable'

export function EquipamentosProjetoAdmin() {
  const { id } = useParams() // ID do projeto
  const [projeto, setProjeto] = useState(null)
  const [equipamentos, setEquipamentos] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchDados() {
    setLoading(true)
    
    // 1. Buscar detalhes do projeto e cliente
    const resProj = await supabase
      .from('projetos')
      .select('nome, clientes(nome)')
      .eq('id', id)
      .single()
      
    if (resProj.data) setProjeto(resProj.data)

    // 2. Buscar equipamentos vinculados
    const resEquip = await supabase
      .from('equipamentos')
      .select('id, ean, sn, created_at, produtos(nome)')
      .eq('projeto_id', id)
      .order('created_at', { ascending: false })
      
    if (resEquip.data) setEquipamentos(resEquip.data)
    
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [id])

  async function handleDelete(idEquip) {
    if (!window.confirm('Excluir este equipamento? Ele não contará mais neste projeto.')) return
    await supabase.from('equipamentos').delete().eq('id', idEquip)
    fetchDados()
  }

  async function handleDeleteMany(ids) {
    const { error } = await supabase.from('equipamentos').delete().in('id', ids)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchDados()
  }



  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          to="/admin/projetos"
          className="p-3 bg-[#111827] hover:bg-[#1e3a5f]/50 border border-[#1e3a5f] rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white">
            {projeto ? projeto.nome : 'Carregando projeto...'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cliente: {projeto?.clientes?.nome || '...'}
          </p>
        </div>
      </div>

      {/* Tabela via DataTable */}
      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex justify-center gap-2">
            <Loader2 className="animate-spin" /> Carregando equipamentos...
          </div>
        ) : (
          <DataTable
            data={equipamentos}
            searchKeys={['ean', 'sn', 'produtos.nome']}
            dateKey="created_at"
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum equipamento bipado para este projeto."
            columns={[
              { 
                key: 'created_at', 
                label: 'Data/Hora', 
                tdClassName: 'text-sm text-slate-400 tabular-nums',
                render: (eq) => new Date(eq.created_at).toLocaleString() 
              },
              { key: 'ean', label: 'EAN', tdClassName: 'font-mono text-sm text-slate-400' },
              { key: 'produto', label: 'Produto', render: (eq) => <span className="font-semibold text-white">{eq.produtos?.nome || 'Desconhecido'}</span> },
              { key: 'sn', label: 'S/N', render: (eq) => <span className="font-mono font-bold text-blue-400 tracking-wide">{eq.sn}</span> },
              {
                key: 'actions',
                label: 'Ações',
                tdClassName: 'text-right',
                render: (eq) => (
                  <button 
                    onClick={() => handleDelete(eq.id)} 
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30"
                    title="Excluir bipe"
                  >
                    <Trash2 size={16} />
                  </button>
                )
              }
            ]}
          />
        )}
      </div>
    </div>
  )
}
