create table if not exists public.lands (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price text not null,
  location text not null,
  size text not null,
  description text not null,
  image text default '',
  created_at timestamptz not null default now()
);

alter table public.lands enable row level security;

drop policy if exists "public can read lands" on public.lands;
create policy "public can read lands"
on public.lands
for select
to anon
using (true);

insert into public.lands (title, price, location, size, description, image)
select *
from (
  values
    (
      'Terreno urbano con servicios',
      'USD 32.000',
      'Zona residencial',
      '420 m2',
      'Lote parejo, buen acceso, luz y agua disponibles. Ideal para vivienda o inversion.',
      ''
    ),
    (
      'Lote amplio para desarrollo',
      'USD 58.000',
      'A metros de ruta principal',
      '900 m2',
      'Excelente frente, entorno en crecimiento y potencial para proyecto comercial.',
      ''
    ),
    (
      'Terreno listo para escriturar',
      'Consultar',
      'Barrio tranquilo',
      '510 m2',
      'Documentacion ordenada, zona con buena demanda y consultas activas.',
      ''
    )
) as seed(title, price, location, size, description, image)
where not exists (select 1 from public.lands);
