create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  topic text not null,
  message text not null,
  source text default 'Formulario de contacto',
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

drop policy if exists "public can create clients" on public.clients;
create policy "public can create clients"
on public.clients
for insert
to anon
with check (true);

notify pgrst, 'reload schema';
