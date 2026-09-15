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
  nome       text not null,
  servicos   text[] default '{}',
  escopo     text default ''
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

-- 5. Tecnicos
create table if not exists public.tecnicos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  telefone   text,
  ativo      boolean default true,
  created_at timestamptz not null default now()
);

-- 6. Reunioes
create table if not exists public.reunioes (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  titulo     text not null,
  data       date not null,
  pauta      text,
  ata        text,
  created_at timestamptz not null default now()
);

-- 7. Etapas do Projeto
create table if not exists public.etapas (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  nome       text not null,
  ordem      integer default 0
);

-- 8. Tasks (Tarefas)
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  etapa_id   uuid references public.etapas(id) on delete set null,
  tecnico_id uuid references public.tecnicos(id) on delete set null,
  titulo     text not null,
  descricao  text,
  status     text not null default 'todo', -- 'todo', 'doing', 'review', 'done'
  ordem      integer default 0,
  created_at timestamptz not null default now()
);

-- 9. Alocacao de Equipamentos
create table if not exists public.alocacao_equipamentos (
  id             uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references public.equipamentos(id) on delete cascade,
  task_id        uuid references public.tasks(id) on delete cascade,
  tecnico_id     uuid not null references public.tecnicos(id) on delete restrict,
  data_alocacao  timestamptz not null default now(),
  observacao     text
);

-- 10. Ferramentas
create table if not exists public.ferramentas (
  id                     uuid primary key default gen_random_uuid(),
  nome                   text not null,
  categoria              text not null, -- Manual, Rede, Fibra Óptica
  estado                 text not null, -- Ótimo, Bom, Desgastado
  quantidade             integer not null default 1,
  descricao              text,
  cidade                 text,
  tecnico_id             uuid references public.tecnicos(id) on delete set null,
  data_atribuicao        date,
  data_verificacao       date,
  observacao_verificacao text,
  created_at             timestamptz not null default now()
);

-- RLS (ajuste conforme sua política de autenticação)
alter table public.clientes    enable row level security;
alter table public.projetos    enable row level security;
alter table public.produtos    enable row level security;
alter table public.equipamentos enable row level security;
alter table public.tecnicos enable row level security;
alter table public.reunioes enable row level security;
alter table public.etapas enable row level security;
alter table public.tasks enable row level security;
alter table public.alocacao_equipamentos enable row level security;
alter table public.ferramentas enable row level security;

-- Políticas permissivas para uso interno (substitua por políticas reais em produção)
create policy "allow_all_clientes"     on public.clientes     for all using (true) with check (true);
create policy "allow_all_projetos"     on public.projetos     for all using (true) with check (true);
create policy "allow_all_produtos"     on public.produtos     for all using (true) with check (true);
create policy "allow_all_equipamentos" on public.equipamentos for all using (true) with check (true);
create policy "allow_all_tecnicos" on public.tecnicos for all using (true) with check (true);
create policy "allow_all_reunioes" on public.reunioes for all using (true) with check (true);
create policy "allow_all_etapas" on public.etapas for all using (true) with check (true);
create policy "allow_all_tasks" on public.tasks for all using (true) with check (true);
create policy "allow_all_alocacoes" on public.alocacao_equipamentos for all using (true) with check (true);
create policy "allow_all_ferramentas" on public.ferramentas for all using (true) with check (true);
