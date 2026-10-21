import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { DataTable } from '../../components/ui/DataTable'
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react'

const FORM_VAZIO = { nome: '', razao_social: '', cnpj_cpf: '', email: '', cidade: '', estado: '' }
const inputClass = 'w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e3a5f] text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'

function formatarCnpjCpf(v) {
  const d = (v || '').replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return v || ''
}

export function ClientesAdmin() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  // Estado do formulário
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  function openNew() {
    setEditId(null)
    setForm(FORM_VAZIO)
    setModalOpen(true)
  }

  function openEdit(c) {
    setEditId(c.id)
    setForm({
      nome: c.nome || '',
      razao_social: c.razao_social || '',
      cnpj_cpf: formatarCnpjCpf(c.cnpj_cpf),
      email: c.email || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.nome.trim()) return

    const cnpjCpf = form.cnpj_cpf.replace(/\D/g, '')
    if (cnpjCpf && cnpjCpf.length !== 11 && cnpjCpf.length !== 14) {
      alert('CNPJ/CPF inválido: deve ter 11 (CPF) ou 14 (CNPJ) dígitos.')
      return
    }

    const payload = {
      nome: form.nome.trim(),
      razao_social: form.razao_social.trim() || null,
      cnpj_cpf: cnpjCpf || null,
      email: form.email.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim().toUpperCase() || null,
    }

    setSaving(true)
    let error;
    if (editId) {
      const { error: err } = await supabase.from('clientes').update(payload).eq('id', editId)
      error = err
    } else {
      const { error: err } = await supabase.from('clientes').insert(payload)
      error = err
    }

    setSaving(false)
    
    if (error) {
      console.error('Erro no Supabase:', error)
      if (error.code === '23505') {
        alert('Já existe um cliente com este CNPJ/CPF.')
        return
      }
      alert(`Erro ao salvar no banco: ${error.message}\nVerifique as políticas RLS no Supabase.`)
      return
    }

    setModalOpen(false)
    fetchClientes()
  }

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza? Isso apagará também TODOS os projetos e equipamentos deste cliente!')) return
    await supabase.from('clientes').delete().eq('id', id)
    fetchClientes()
  }

  async function handleDeleteMany(ids) {
    // Note: cascade deletion happens in the DB if configured, otherwise needs care
    const { error } = await supabase.from('clientes').delete().in('id', ids)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchClientes()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie as empresas de destino</p>
        </div>
        <button
          onClick={openNew}
          className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex justify-center gap-2"><Loader2 className="animate-spin" /> Carregando...</div>
        ) : (
          <DataTable
            data={clientes}
            searchKeys={['nome', 'razao_social', 'cnpj_cpf']}
            onDeleteMany={handleDeleteMany}
            emptyMessage="Nenhum cliente encontrado."
            columns={[
              {
                key: 'nome',
                label: 'Nome do Cliente',
                render: (c) => (
                  <div>
                    <Link
                      to={`/admin/projetos?q=${encodeURIComponent(c.nome)}`}
                      title={`Ver projetos de ${c.nome}`}
                      className="font-semibold text-white hover:text-blue-400 hover:underline"
                    >
                      {c.nome}
                    </Link>
                    {c.razao_social && <p className="text-xs text-slate-400">{c.razao_social}</p>}
                  </div>
                ),
              },
              { key: 'cnpj_cpf', label: 'CNPJ/CPF', render: (c) => <span className="font-mono text-sm text-slate-300">{formatarCnpjCpf(c.cnpj_cpf) || '—'}</span> },
              {
                key: 'omie_codigo',
                label: 'Omie',
                render: (c) => c.omie_codigo
                  ? <span className="text-xs font-bold text-emerald-400">#{c.omie_codigo}</span>
                  : <span className="text-xs text-slate-600">não sincronizado</span>,
              },
              { 
                key: 'actions', 
                label: 'Ações', 
                tdClassName: 'text-right space-x-2', 
                render: (c) => (
                  <>
                    <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-blue-500/30" title="Editar" aria-label="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-[#0f172a] rounded-lg border border-[#1e3a5f]/50 hover:border-red-500/30" title="Excluir" aria-label="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </>
                )
              }
            ]}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Cliente' : 'Novo Cliente'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Nome fantasia">
            <input
              autoFocus
              type="text"
              name="nome"
              autoComplete="off"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className={inputClass}
              placeholder="Ex: Trilan"
            />
          </Field>
          <Field label="Razão social">
            <input type="text" name="razao_social" autoComplete="off" value={form.razao_social} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="CNPJ/CPF">
              <input type="text" name="cnpj_cpf" autoComplete="off" inputMode="numeric" value={form.cnpj_cpf} onChange={e => setForm(f => ({ ...f, cnpj_cpf: e.target.value }))} onBlur={() => setForm(f => ({ ...f, cnpj_cpf: formatarCnpjCpf(f.cnpj_cpf) }))} className={`${inputClass} font-mono`} placeholder="Só números" />
            </Field>
            <Field label="E-mail">
              <input type="email" name="email" autoComplete="off" spellCheck={false} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-4">
            <Field label="Cidade">
              <input type="text" name="cidade" autoComplete="off" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="UF">
              <input type="text" name="uf" autoComplete="off" maxLength={2} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} className={`${inputClass} uppercase`} />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={!form.nome.trim() || saving} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
