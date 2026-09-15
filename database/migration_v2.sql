-- ================================================================
-- MIGRATION: Adicionar novos campos e tabelas ao sistema existente
-- Execute este script no SQL Editor do Supabase
-- ================================================================

-- 1. Adicionar colunas novas na tabela projetos (que já existe)
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS servicos text[] default '{}',
  ADD COLUMN IF NOT EXISTS escopo   text    default '';

-- 2. Tecnicos
create table if not exists public.tecnicos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  telefone   text,
  ativo      boolean default true,
  created_at timestamptz not null default now()
);

-- 3. Reunioes
create table if not exists public.reunioes (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  titulo     text not null,
  data       date not null,
  pauta      text,
  ata        text,
  created_at timestamptz not null default now()
);

-- 4. Etapas do Projeto
create table if not exists public.etapas (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  nome       text not null,
  ordem      integer default 0
);

-- 5. Tasks (Tarefas)
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  etapa_id   uuid references public.etapas(id) on delete set null,
  tecnico_id uuid references public.tecnicos(id) on delete set null,
  titulo     text not null,
  descricao  text,
  status     text not null default 'todo',
  ordem      integer default 0,
  created_at timestamptz not null default now()
);

-- 6. Alocacao de Equipamentos
create table if not exists public.alocacao_equipamentos (
  id             uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references public.equipamentos(id) on delete cascade,
  task_id        uuid references public.tasks(id) on delete cascade,
  tecnico_id     uuid not null references public.tecnicos(id) on delete restrict,
  data_alocacao  timestamptz not null default now(),
  observacao     text
);

-- 7. Habilitar RLS nas novas tabelas
alter table public.tecnicos            enable row level security;
alter table public.reunioes            enable row level security;
alter table public.etapas              enable row level security;
alter table public.tasks               enable row level security;
alter table public.alocacao_equipamentos enable row level security;

-- 8. Políticas permissivas para as novas tabelas (sem duplicar)
drop policy if exists "allow_all_tecnicos"  on public.tecnicos;
drop policy if exists "allow_all_reunioes"  on public.reunioes;
drop policy if exists "allow_all_etapas"    on public.etapas;
drop policy if exists "allow_all_tasks"     on public.tasks;
drop policy if exists "allow_all_alocacoes" on public.alocacao_equipamentos;

create policy "allow_all_tecnicos"  on public.tecnicos            for all using (true) with check (true);
create policy "allow_all_reunioes"  on public.reunioes            for all using (true) with check (true);
create policy "allow_all_etapas"    on public.etapas              for all using (true) with check (true);
create policy "allow_all_tasks"     on public.tasks               for all using (true) with check (true);
create policy "allow_all_alocacoes" on public.alocacao_equipamentos for all using (true) with check (true);
