alter table public.lands add column if not exists long_description text default '';
alter table public.lands add column if not exists seller_name text default '';
alter table public.lands add column if not exists seller_phone text default '';
alter table public.lands add column if not exists seller_description text default '';
alter table public.lands add column if not exists gallery jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
