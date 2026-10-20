-- ================================================================
-- MIGRATION v7: Preparação para integração com o Omie
-- Execute no SQL Editor do Supabase
--
-- Convenção: cada registro do sistema é enviado ao Omie com
-- "codigo_*_integracao" = nosso id (clientes/projetos: uuid; produtos: ean).
-- O código que o Omie devolve fica salvo em omie_codigo.
-- ================================================================

-- 1. Clientes: dados fiscais exigidos pelo Omie
alter table public.clientes
  add column if not exists razao_social         text,
  add column if not exists cnpj_cpf             text,  -- só dígitos
  add column if not exists email                text,
  add column if not exists cidade               text,
  add column if not exists estado               text,  -- UF
  add column if not exists omie_codigo          bigint,
  add column if not exists omie_sincronizado_em timestamptz;

create unique index if not exists clientes_cnpj_cpf_unique
  on public.clientes (cnpj_cpf) where cnpj_cpf is not null;
create unique index if not exists clientes_omie_codigo_unique
  on public.clientes (omie_codigo) where omie_codigo is not null;

-- 2. Produtos: código interno (SKU), unidade e NCM usados pelo Omie
alter table public.produtos
  add column if not exists codigo               text,
  add column if not exists unidade              text not null default 'UN',
  add column if not exists ncm                  text,
  add column if not exists omie_codigo          bigint,
  add column if not exists omie_sincronizado_em timestamptz;

create unique index if not exists produtos_codigo_unique
  on public.produtos (codigo) where codigo is not null;
create unique index if not exists produtos_omie_codigo_unique
  on public.produtos (omie_codigo) where omie_codigo is not null;

-- 3. Projetos: o Omie também tem cadastro de projetos
alter table public.projetos
  add column if not exists omie_codigo          bigint,
  add column if not exists omie_sincronizado_em timestamptz;

create unique index if not exists projetos_omie_codigo_unique
  on public.projetos (omie_codigo) where omie_codigo is not null;

-- 4. Equipamentos: coluna já usada pelo sistema, mas ausente nos scripts
alter table public.equipamentos
  add column if not exists n_patrimonio text;

-- 5. Normaliza CNPJ/CPF e NCM (só dígitos) antes de gravar
create or replace function public.normalizar_dados_fiscais()
returns trigger as $$
begin
  if tg_table_name = 'clientes' then
    new.cnpj_cpf := nullif(regexp_replace(coalesce(new.cnpj_cpf, ''), '\D', '', 'g'), '');
    if new.cnpj_cpf is not null and length(new.cnpj_cpf) not in (11, 14) then
      raise exception 'CNPJ/CPF inválido: deve ter 11 (CPF) ou 14 (CNPJ) dígitos'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'produtos' then
    new.ncm := nullif(regexp_replace(coalesce(new.ncm, ''), '\D', '', 'g'), '');
    new.codigo := nullif(btrim(coalesce(new.codigo, '')), '');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_normalizar_clientes on public.clientes;
create trigger trg_normalizar_clientes
before insert or update on public.clientes
for each row execute function public.normalizar_dados_fiscais();

drop trigger if exists trg_normalizar_produtos on public.produtos;
create trigger trg_normalizar_produtos
before insert or update on public.produtos
for each row execute function public.normalizar_dados_fiscais();

-- 6. Fila de sincronização com o Omie (outbox)
--    Toda alteração em clientes/produtos/projetos entra na fila; um worker
--    (Edge Function do Supabase) lê os pendentes e envia ao Omie.
--    Há no máximo 1 item pendente por registro: alterações seguidas se juntam.
create table if not exists public.omie_fila (
  id            uuid primary key default gen_random_uuid(),
  entidade      text not null,             -- 'cliente' | 'produto' | 'projeto'
  registro_id   text not null,             -- id/ean do registro local
  operacao      text not null,             -- 'upsert' | 'delete'
  status        text not null default 'pendente', -- 'pendente' | 'processando' | 'ok' | 'erro'
  tentativas    integer not null default 0,
  ultimo_erro   text,
  created_at    timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  processado_em timestamptz
);

create unique index if not exists omie_fila_pendente_unique
  on public.omie_fila (entidade, registro_id) where status = 'pendente';
create index if not exists omie_fila_status_idx
  on public.omie_fila (status, created_at);

create or replace function public.enfileirar_omie()
returns trigger as $$
declare
  v_entidade text;
  v_id text;
  v_op text;
begin
  v_entidade := case tg_table_name
    when 'clientes' then 'cliente'
    when 'produtos' then 'produto'
    when 'projetos' then 'projeto'
  end;

  -- Lê o id via jsonb: "new.ean" quebra em tabelas sem a coluna ean
  if tg_op = 'DELETE' then
    v_id := to_jsonb(old) ->> case when tg_table_name = 'produtos' then 'ean' else 'id' end;
    v_op := 'delete';
  else
    -- Atualização feita pelo próprio worker (só campos omie_*) não reenfileira
    if tg_op = 'UPDATE'
       and (to_jsonb(new) - 'omie_codigo' - 'omie_sincronizado_em')
         = (to_jsonb(old) - 'omie_codigo' - 'omie_sincronizado_em') then
      return new;
    end if;
    v_id := to_jsonb(new) ->> case when tg_table_name = 'produtos' then 'ean' else 'id' end;
    v_op := 'upsert';
  end if;

  insert into public.omie_fila (entidade, registro_id, operacao)
  values (v_entidade, v_id, v_op)
  on conflict (entidade, registro_id) where status = 'pendente'
  do update set operacao = excluded.operacao, atualizado_em = now();

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_omie_clientes on public.clientes;
create trigger trg_omie_clientes
after insert or update or delete on public.clientes
for each row execute function public.enfileirar_omie();

drop trigger if exists trg_omie_produtos on public.produtos;
create trigger trg_omie_produtos
after insert or update or delete on public.produtos
for each row execute function public.enfileirar_omie();

drop trigger if exists trg_omie_projetos on public.projetos;
create trigger trg_omie_projetos
after insert or update or delete on public.projetos
for each row execute function public.enfileirar_omie();

-- 7. Segurança: o app só lê a fila; quem escreve é o trigger e o worker
--    (o worker usa a service_role, que ignora RLS)
alter table public.omie_fila enable row level security;

drop policy if exists "omie_fila leitura" on public.omie_fila;
create policy "omie_fila leitura" on public.omie_fila
  for select to authenticated using (true);
