// Monta as opções do <SearchSelect> a partir das linhas do banco.
// `detalhe` aparece embaixo do nome; `busca` são atributos extras pesquisáveis.

export function normalizarBusca(texto) {
  return String(texto ?? '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function soDigitos(texto) {
  return String(texto ?? '').replace(/\D/g, '')
}

export function formatarDocumento(doc) {
  const d = soDigitos(doc)
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return doc || ''
}

function juntar(...partes) {
  return partes.filter(Boolean).join(' · ')
}

function local(c) {
  if (!c) return ''
  const uf = (c.estado || '').trim().toUpperCase()
  return [c.cidade, uf].filter(Boolean).join('/')
}

export function opcoesClientes(clientes) {
  return (clientes ?? []).map(c => ({
    value: c.id,
    label: c.nome,
    detalhe: juntar(c.razao_social !== c.nome && c.razao_social, formatarDocumento(c.cnpj_cpf), local(c)),
    busca: [c.razao_social, c.cnpj_cpf, c.email, c.cidade, c.estado],
  }))
}

// Projetos podem vir com o cliente embutido (select 'clientes(nome, …)')
export function opcoesProjetos(projetos) {
  return (projetos ?? []).map(p => ({
    value: p.id,
    label: p.nome,
    detalhe: juntar(p.clientes?.nome, local(p.clientes), (p.servicos ?? []).join(', ')),
    busca: [p.clientes?.nome, p.clientes?.razao_social, p.clientes?.cnpj_cpf, p.clientes?.cidade, p.clientes?.estado, ...(p.servicos ?? [])],
  }))
}

export function opcoesTecnicos(tecnicos) {
  return (tecnicos ?? []).map(t => ({
    value: t.id,
    label: t.nome,
    detalhe: juntar(t.telefone, t.ativo === false && 'Inativo'),
    busca: [t.telefone],
  }))
}

export function opcoesProdutos(produtos) {
  return (produtos ?? []).map(p => ({
    value: p.ean,
    label: p.nome,
    detalhe: juntar(`EAN ${p.ean}`, p.codigo && `SKU ${p.codigo}`, p.unidade, p.controla_sn === false && 'sem S/N'),
    busca: [p.ean, p.codigo, p.ncm],
  }))
}
