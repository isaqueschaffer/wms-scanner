import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { DataTable } from '../../components/ui/DataTable'
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react'

const UNIDADES = ['UN', 'PC', 'CX', 'KIT', 'M', 'RL', 'KG']
const inputClass = 'w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'

export function ProdutosAdmin() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  const [editEan, setEditEan] = useState(null)
  const [ean, setEan] = useState('')
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [unidade, setUnidade] = useState('UN')
  const [ncm, setNcm] = useState('')
  const [controlaSn, setControlaSn] = useState(true)
  const [saving, setSaving] = useState(false)

  async function fetchProdutos() {
    setLoading(true)
    const { data } = await supabase.from('produtos').select('*').order('nome')
    setProdutos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProdutos()
  }, [])

  function openNew() {
    setEditEan(null)
    setEan('')
    setNome('')
    setCodigo('')
    setUnidade('UN')
    setNcm('')
    setControlaSn(true)
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditEan(p.ean)
    setEan(p.ean)
    setNome(p.nome)
    setCodigo(p.codigo || '')
    setUnidade(p.unidade || 'UN')
    setNcm(p.ncm || '')
    setControlaSn(p.controla_sn !== false)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!ean.trim() || !nome.trim()) return

    const ncmLimpo = ncm.replace(/\D/g, '')
    if (ncmLimpo && ncmLimpo.length !== 8) {
      alert('NCM inválido: deve ter 8 dígitos.')
      return
    }

    const dados = {
      nome: nome.trim(),
      codigo: codigo.trim() || null,
      unidade,
      ncm: ncmLimpo || null,
      controla_sn: controlaSn,
    }

    setSaving(true)
    // Nota: Mudar PK (ean) não é trivial. Na edição o EAN fica fixo.
    const { error } = editEan
      ? await supabase.from('produtos').update(dados).eq('ean', editEan)
      : await supabase.from('produtos').insert({ ean: ean.trim(), ...dados })
    setSaving(false)

    if (error) {
      if (error.code === '23505') {
        alert(editEan || !error.message.includes('pkey')
          ? 'Já existe um produto com este código interno.'
          : 'Já existe um produto com este EAN.')
      } else {
        alert(`Erro ao salvar: ${error.message}`)
      }
      return
    }

    setModalOpen(false)
    fetchProdutos()
  }

  async function handleDelete(eanToDelete) {
    if (!window.confirm('Excluir este produto? Ele será removido de todas as leituras que o referenciam.')) return
    await supabase.from('produtos').delete().eq('ean', eanToDelete)
    fetchProdutos()
  }

  async function handleDeleteMany(eans) {
    const { error } = await supabase.from('produtos').delete().in('ean', eans)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchProdutos()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Produtos</h1>
          <p className="text-sm text-slate-400 mt-1">Catálogo de EANs conhecidos</p>
        </div>
        <button onClick={openNew} className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-400 flex justify-center gap-2"><Loader2 className="animate-spin" /> Carregando…</div>
        ) : (
          <DataTable
            data={produtos}
            searchKeys={['ean', 'nome', 'codigo']}
            idKey="ean"
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum produto encontrado."
            columns={[
              { key: 'ean', label: 'EAN (Código)', tdClassName: 'font-mono text-sm text-blue-400' },
              { key: 'nome', label: 'Nome do Produto', render: (p) => <span className="font-semibold text-white">{p.nome}</span> },
              { key: 'codigo', label: 'Código', render: (p) => <span className="font-mono text-sm text-slate-300">{p.codigo || '—'}</span> },
              { key: 'unidade', label: 'Un.', tdClassName: 'text-sm text-slate-400' },
              {
                key: 'controla_sn',
                label: 'S/N',
                render: (p) => p.controla_sn === false
                  ? <span className="text-xs font-bold text-amber-400">Por quantidade</span>
                  : <span className="text-xs text-slate-400">Por serial</span>,
              },
              { key: 'ncm', label: 'NCM', render: (p) => <span className="font-mono text-sm text-slate-400">{p.ncm || '—'}</span> },
              {
                key: 'omie_codigo',
                label: 'Omie',
                render: (p) => p.omie_codigo
                  ? <span className="text-xs font-bold text-emerald-400">#{p.omie_codigo}</span>
                  : <span className="text-xs text-slate-400">não sincronizado</span>,
              },
              {
                key: 'actions',
                label: 'Ações',
                tdClassName: 'text-right space-x-2',
                render: (p) => (
                  <>
                    <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30" title="Editar" aria-label="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(p.ean)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30" title="Excluir" aria-label="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </>
                )
              }
            ]}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editEan ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="EAN (Código de Barras)">
            <input
              autoFocus={!editEan}
              type="text"
              name="ean"
              autoComplete="off"
              spellCheck={false}
              value={ean}
              onChange={e => setEan(e.target.value)}
              disabled={!!editEan}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white disabled:opacity-50"
            />
          </Field>
          <Field label="Nome">
            <input
              autoFocus={!!editEan}
              type="text"
              name="nome"
              autoComplete="off"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_9rem] gap-4">
            <Field label="Código interno (SKU)">
              <input type="text" name="codigo" autoComplete="off" spellCheck={false} value={codigo} onChange={e => setCodigo(e.target.value)} className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Unidade">
              <select name="unidade" value={unidade} onChange={e => setUnidade(e.target.value)} className={inputClass}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="NCM">
              <input type="text" name="ncm" autoComplete="off" inputMode="numeric" maxLength={10} value={ncm} onChange={e => setNcm(e.target.value)} className={`${inputClass} font-mono`} placeholder="8 dígitos" />
            </Field>
          </div>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={controlaSn} onChange={e => setControlaSn(e.target.checked)} className="mt-1 w-4 h-4 accent-blue-500" />
            <span>
              <span className="block text-sm font-semibold text-slate-300">Controla número de série (S/N)</span>
              <span className="block text-xs text-slate-400">Desmarque para itens sem serial, como bobina de cabo: o projeto passa a registrar só a quantidade.</span>
            </span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={!ean.trim() || !nome.trim() || saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
