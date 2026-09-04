-- Esquema do banco de dados Supabase
-- Execute no SQL Editor do seu projeto Supabase

-- 1. Clientes
create table if not exists public.clientes (
  id   uuid primary key default gen_random_uuid(),
  nome text not null
);

-- 2. Projetos
create table if not exists public.projetos (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome       text not null
);
create index if not exists projetos_cliente_id_idx on public.projetos(cliente_id);

-- 3. Produtos
create table if not exists public.produtos (
  ean  text primary key,
  nome text not null
);

-- 4. Equipamentos
create table if not exists public.equipamentos (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  ean        text not null references public.produtos(ean),
  sn         text not null,
  created_at timestamptz not null default now()
);
create index if not exists equipamentos_projeto_id_idx on public.equipamentos(projeto_id);
create index if not exists equipamentos_sn_idx         on public.equipamentos(sn);

-- Unicidade: SN não pode repetir dentro do mesmo projeto
create unique index if not exists equipamentos_projeto_sn_unique
  on public.equipamentos(projeto_id, sn);

-- RLS (ajuste conforme sua política de autenticação)
alter table public.clientes    enable row level security;
alter table public.projetos    enable row level security;
alter table public.produtos    enable row level security;
alter table public.equipamentos enable row level security;

-- Políticas permissivas para uso interno (substitua por políticas reais em produção)
create policy "allow_all_clientes"     on public.clientes     for all using (true) with check (true);
create policy "allow_all_projetos"     on public.projetos     for all using (true) with check (true);
create policy "allow_all_produtos"     on public.produtos     for all using (true) with check (true);
create policy "allow_all_equipamentos" on public.equipamentos for all using (true) with check (true);
