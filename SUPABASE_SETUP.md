# Setup do Supabase para o projeto Maestro Gestão

Este guia explica como conectar o projeto ao Supabase e criar as tabelas necessárias para que os módulos de alunos, agenda, finanças, orçamentos e configurações funcionem corretamente.

## 1) Criar o projeto no Supabase

1. Acesse https://supabase.com/
2. Crie um novo projeto
3. Copie:
   - Project URL
   - Anon key
   - Service role key (opcional para uso em backend/server-side)

## 2) Configurar o ambiente do projeto

Crie um arquivo `.env.local` na raiz do projeto com:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Se quiser usar também no backend mais tarde, pode adicionar:

```env
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

Importante:
- O projeto usa `import.meta.env.VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Sem essas variáveis, o cliente Supabase é inicializado com valores falsos e a aplicação não consegue se conectar ao banco.

## 3) Acessar o SQL Editor do Supabase

No painel do Supabase:

1. Vá em `SQL Editor`
2. Cole os comandos abaixo
3. Execute em sequência

## 4) Script SQL para criação das tabelas

```sql
create extension if not exists pgcrypto;

-- PERFIL DO USUÁRIO
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user',
  phone text,
  created_at timestamptz not null default now()
);

-- CONFIGURAÇÕES GERAIS DA ESCOLA
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  school_name text not null default 'Escola de Música',
  logo_url text,
  google_calendar_email text,
  sync_with_google_calendar boolean not null default false,
  admin_email text,
  teacher_phone text,
  default_lesson_duration integer not null default 60,
  available_hours jsonb not null default '{
    "monday": [],
    "tuesday": [],
    "wednesday": [],
    "thursday": [],
    "friday": [],
    "saturday": [],
    "sunday": []
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- ALUNOS
create table if not exists public.student (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  parent_name text,
  parent_phone text,
  address text,
  instrument text,
  level text default 'beginner',
  student_status text not null default 'active',
  lesson_day text,
  lesson_time text,
  birthday_day integer,
  birthday_month integer,
  monthly_payment numeric(12,2) default 0,
  payment_day integer,
  payment_status text default 'pending',
  last_payment_date date,
  next_payment_date date,
  notes text,
  created_date timestamptz not null default now()
);

-- AULAS
create table if not exists public.lesson (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.student(id) on delete set null,
  student_name text,
  instrument text,
  date date not null,
  start_time text,
  end_time text,
  duration integer default 60,
  status text default 'scheduled',
  payment_status text default 'pending',
  price numeric(10,2) default 0,
  location text,
  notes text,
  created_date timestamptz not null default now()
);

-- TRANSAÇÕES FINANCEIRAS
create table if not exists public.transaction (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  category text,
  amount numeric(12,2) not null default 0,
  description text,
  date date not null,
  payment_method text,
  student_name text,
  created_at timestamptz not null default now()
);

-- RECIBOS
create table if not exists public.receipt (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  student_id uuid references public.student(id) on delete set null,
  student_name text not null,
  amount numeric(12,2) not null default 0,
  description text,
  payment_date date,
  payment_method text,
  status text default 'paid',
  created_date timestamptz not null default now()
);

-- CLIENTES / ORÇAMENTOS
create table if not exists public.client (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.quote (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  client_id uuid references public.client(id) on delete set null,
  client_name text not null,
  client_email text,
  client_phone text,
  status text default 'pending',
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  notes text,
  created_date timestamptz not null default now()
);

-- CONFIGURAÇÕES DA EMPRESA
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  document text,
  address text,
  phone text,
  email text,
  logo_url text,
  bank_details text,
  created_at timestamptz not null default now()
);

-- ORDENS DE SERVIÇO
create table if not exists public.service_order (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  quote_id uuid references public.quote(id) on delete set null,
  client_id uuid references public.client(id) on delete set null,
  client_name text,
  client_email text,
  client_phone text,
  status text default 'pending',
  start_date date,
  completion_date date,
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  notes text,
  created_date timestamptz not null default now()
);
```

## 5) Ativação do Supabase Auth (opcional, mas recomendado)

Se o projeto for usado com autenticação real, ative no painel:

- `Authentication > Providers`
- Habilite `Email` e/ou `Google`
- Ajuste o redirect URL do frontend, se houver

Para uso rápido local, você também pode deixar o app em modo de desenvolvimento sem autenticação, mas o código atual espera dados de `profiles` e `app_settings`.

## 6) Criar bucket para upload de logos

O código usa `base44.integrations.Core.UploadFile` com `bucket = 'public'`.

No Supabase:

1. Vá em `Storage`
2. Crie um bucket chamado `public`
3. Defina como `Public` se quiser que a imagem fique acessível publicamente

Se preferir outro nome, ajuste no helper do cliente em `src/api/base44Client.js`:

```js
UploadFile: async ({ file, bucket = 'public' }) => {
```

## 7) Permitir acesso em desenvolvimento

Se quiser testar rapidamente sem bloquear tudo por RLS, pode desabilitar a segurança por enquanto:

```sql
alter table public.profiles disable row level security;
alter table public.app_settings disable row level security;
alter table public.student disable row level security;
alter table public.lesson disable row level security;
alter table public.transaction disable row level security;
alter table public.receipt disable row level security;
alter table public.client disable row level security;
alter table public.quote disable row level security;
alter table public.company_settings disable row level security;
alter table public.service_order disable row level security;
```

Isso é útil para desenvolvimento local, mas em produção o ideal é criar políticas específicas para cada tabela.

## 8) Inserir dados iniciais

Exemplo de configuração inicial do sistema:

```sql
insert into public.app_settings (
  school_name,
  logo_url,
  google_calendar_email,
  sync_with_google_calendar,
  admin_email,
  teacher_phone,
  default_lesson_duration,
  available_hours
) values (
  'Escola de Música Maestro',
  '',
  'admin@exemplo.com',
  false,
  'admin@exemplo.com',
  '(11) 99999-9999',
  60,
  '{
    "monday": [{"start": "09:00", "end": "12:00"}],
    "tuesday": [{"start": "09:00", "end": "12:00"}],
    "wednesday": [{"start": "09:00", "end": "12:00"}],
    "thursday": [{"start": "09:00", "end": "12:00"}],
    "friday": [{"start": "09:00", "end": "12:00"}],
    "saturday": [],
    "sunday": []
  }'::jsonb
);
```

Exemplo de aluno:

```sql
insert into public.student (
  full_name,
  email,
  phone,
  instrument,
  level,
  lesson_day,
  lesson_time,
  address,
  notes
) values (
  'João da Silva',
  'joao@email.com',
  '(11) 98888-7777',
  'Violão',
  'beginner',
  'Terça-feira',
  '19:00',
  'Rua das Flores, 123',
  'Aluno iniciante, precisa de acompanhamento semanal.'
);
```

## 9) Verificar o funcionamento no app

Depois de criar as tabelas e preencher os dados iniciais, teste:

1. Rodar o app em desenvolvimento
2. Abrir a página de `Dashboard`
3. Abrir `Students`
4. Abrir `Schedule`
5. Abrir `Settings`
6. Verificar se os dados do Supabase aparecem corretamente

Se alguma página estiver em branco:
- confirme se a tabela existe
- confirme se o nome da tabela bate exatamente com o nome usado no código
- confirme se o `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretos

## 10) Observações importantes

- O projeto usa nomes de tabela no plural em alguns pontos e no singular em outros; a convenção principal usada no app é:
  - `student`
  - `lesson`
  - `transaction`
  - `app_settings`
  - `profiles`
  - `receipt`
  - `client`
  - `quote`
  - `company_settings`
  - `service_order`
- O nome exato da tabela precisa bater com o código. Se qualquer uma estiver com nome diferente, a aplicação quebra na leitura.
- Em produção, vale a pena usar políticas RLS e evitar permitir escrita pública sem autenticação.

## 11) Manter automaticamente 12 meses de aulas

O arquivo [`supabase/maintain_future_lessons.sql`](supabase/maintain_future_lessons.sql) cria uma tarefa mensal no Supabase. Ela roda no primeiro dia de cada mês, às 03:00 (horário de São Paulo), e para cada aluno ativo com dia e horário de aula:

- verifica as aulas entre hoje e os próximos 12 meses;
- cria somente as datas que ainda não existem;
- não duplica aulas já agendadas;
- preenche também os alunos que já estavam cadastrados na primeira execução.

No SQL Editor do Supabase, execute todo o conteúdo do arquivo. A extensão `pg_cron` precisa estar disponível no projeto.

## 12) Próximo passo recomendado

Em seguida, recomendo:

1. criar as tabelas com o SQL acima
2. testar inserções de um aluno e uma configuração
3. depois implementar autenticação real do Supabase no frontend
4. por fim, ativar RLS com políticas seguras para produção

Se quiser, posso continuar com a próxima etapa e criar também um arquivo `.env.example` e um script SQL pronto para copiar e colar no Supabase em um único bloco.
