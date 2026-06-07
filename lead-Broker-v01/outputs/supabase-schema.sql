create table if not exists public.lands (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price text not null,
  location text not null,
  map_url text default '',
  size text not null,
  description text not null,
  long_description text default '',
  seller_name text default '',
  seller_phone text default '',
  seller_description text default '',
  gallery jsonb not null default '[]'::jsonb,
  image text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  topic text not null,
  message text not null,
  source text default 'Formulario de contacto',
  created_at timestamptz not null default now()
);

alter table public.lands add column if not exists long_description text default '';
alter table public.lands add column if not exists seller_name text default '';
alter table public.lands add column if not exists seller_phone text default '';
alter table public.lands add column if not exists seller_description text default '';
alter table public.lands add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.lands add column if not exists map_url text default '';

alter table public.lands enable row level security;
alter table public.clients enable row level security;

drop policy if exists "public can read lands" on public.lands;
create policy "public can read lands"
on public.lands
for select
to anon
using (true);

drop policy if exists "public can create clients" on public.clients;
create policy "public can create clients"
on public.clients
for insert
to anon
with check (true);

insert into public.lands (
  title,
  price,
  location,
  map_url,
  size,
  description,
  long_description,
  seller_name,
  seller_phone,
  seller_description,
  gallery,
  image
)
select *
from (
  values
    (
      'Terreno urbano con servicios',
      'USD 32.000',
      'Zona residencial',
      '',
      '420 m2',
      'Lote parejo, buen acceso, luz y agua disponibles. Ideal para vivienda o inversion.',
      'Lote parejo con buen acceso, servicios disponibles y entorno residencial. Ideal para vivienda familiar o inversion a mediano plazo.',
      'Agustina',
      '092 420 997',
      'Intermediaria comercial de Lead Brokers. Coordina consultas, visitas y seguimiento hasta el cierre.',
      '[]'::jsonb,
      ''
    ),
    (
      'Lote amplio para desarrollo',
      'USD 58.000',
      'A metros de ruta principal',
      '',
      '900 m2',
      'Excelente frente, entorno en crecimiento y potencial para proyecto comercial.',
      'Terreno amplio con frente destacado, buena exposicion y acceso rapido. Recomendado para desarrollo, deposito, local o inversion comercial.',
      'Agustina',
      '092 420 997',
      'Lead Brokers acompana la conexion entre vendedor e interesados calificados.',
      '[]'::jsonb,
      ''
    ),
    (
      'Terreno listo para escriturar',
      'Consultar',
      'Barrio tranquilo',
      '',
      '510 m2',
      'Documentacion ordenada, zona con buena demanda y consultas activas.',
      'Terreno en barrio tranquilo con documentacion ordenada. Buena opcion para quienes buscan avanzar con una operacion clara y acompanada.',
      'Agustina',
      '092 420 997',
      'Gestion comercial con foco en transparencia, contacto directo y cierre ordenado.',
      '[]'::jsonb,
      ''
    )
) as seed(title, price, location, map_url, size, description, long_description, seller_name, seller_phone, seller_description, gallery, image)
where not exists (select 1 from public.lands);
