-- Pi Day competition schema for Supabase (PostgreSQL)
-- Run in SQL Editor after creating a project.
-- Enable Authentication → Providers → Anonymous sign-ins.
-- π: canonical copy is src/data/piDigits.ts. After editing it, run `npm run sync-pi-sql`
-- to rewrite the inlined constant inside public.submit_digit.

-- Legacy table removed — digits are a constant in submit_digit, not stored as rows.
drop policy if exists pi_reference_select on public.pi_reference;
drop table if exists public.pi_reference;

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  started_at timestamptz,
  admin_secret text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_type int not null check (avatar_type between 0 and 9),
  digits_correct int not null default 0,
  wrong_attempts int not null default 0,
  eliminated boolean not null default false,
  joined_at timestamptz not null default now(),
  last_input_at timestamptz,
  unique (competition_id, user_id)
);

create index if not exists participants_competition_idx on public.participants(competition_id);

-- משתמשי סכמה קיימים: הוספת עמודה בלי לאבד נתונים
alter table public.participants add column if not exists wrong_attempts int not null default 0;
alter table public.participants drop constraint if exists participants_wrong_attempts_check;
alter table public.participants add constraint participants_wrong_attempts_check
  check (wrong_attempts >= 0 and wrong_attempts <= 3);

-- Seed competition: change admin_secret. After running, copy id for VITE_COMPETITION_ID:
-- select id, admin_secret from public.competitions;
insert into public.competitions (admin_secret, status)
select 'pi-day-admin-secret', 'waiting'
where not exists (select 1 from public.competitions limit 1);

alter table public.competitions enable row level security;
alter table public.participants enable row level security;

-- RLS: anyone authenticated (including anonymous auth) can read
drop policy if exists competitions_select on public.competitions;
create policy competitions_select
  on public.competitions for select
  to authenticated
  using (true);

drop policy if exists participants_select on public.participants;
create policy participants_select
  on public.participants for select
  to authenticated
  using (true);

-- No direct writes to participants/competitions from clients

create or replace function public.join_competition(
  competition_uuid uuid,
  player_name text,
  avatar integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed text := trim(player_name);
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'not_authed');
  end if;
  if length(trimmed) < 1 or length(trimmed) > 48 then
    return jsonb_build_object('error', 'bad_name');
  end if;
  if avatar < 0 or avatar > 9 then
    return jsonb_build_object('error', 'bad_avatar');
  end if;

  if not exists (select 1 from public.competitions where id = competition_uuid) then
    return jsonb_build_object('error', 'bad_competition');
  end if;

  insert into public.participants (competition_id, user_id, display_name, avatar_type)
  values (competition_uuid, auth.uid(), trimmed, avatar)
  on conflict (competition_id, user_id) do update
    set display_name = excluded.display_name,
        avatar_type = excluded.avatar_type;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.submit_digit(competition_uuid uuid, digit text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.participants%rowtype;
  comp public.competitions%rowtype;
  expected text;
  pi_str constant text := $pi$31415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632788659361533818279682303019520353018529689957736225994138912497217752834791315155748572424541506959508295331168617278558890750983817546374649393192550604009277016711390098488240128583616035637076601047101819429555961989467678374494482553797747268471040475346462080466842590694912933136770289891521047521620569660240580381501935112533824300355876402474964732639141992726042699227967823547816360093417216412199245863150302861829745557067498385054945885869269956909272107975093029553211653449872027559602364806654991198818347977535663698074265425278625518184175746728909777727938000816470600161452491921732172147723501414419735685481613611573525521334757418494684385233239073941433345477624168625189835694855620992192221842725502542568876717904946016534668049886272327917860857843838279679766814541009538837863609506800642251252051173929848960841284886269456042419652850222106611863067442786220391949450471237137869609563643719172874677646575739624138908658326459958133904780275900$pi$;
  new_wrong int;
begin
  if digit is null or length(digit) <> 1 or digit !~ '^[0-9]$' then
    return jsonb_build_object('error', 'invalid_digit');
  end if;

  select * into p
  from public.participants
  where user_id = auth.uid() and competition_id = competition_uuid;

  if not found then
    return jsonb_build_object('error', 'not_joined');
  end if;

  select * into comp from public.competitions where id = p.competition_id;
  if not found then
    return jsonb_build_object('error', 'no_competition');
  end if;

  if comp.status <> 'active' then
    return jsonb_build_object('error', 'not_active');
  end if;

  if p.eliminated then
    return jsonb_build_object('error', 'eliminated', 'digits', p.digits_correct);
  end if;

  if length(pi_str) < p.digits_correct + 1 then
    return jsonb_build_object('error', 'pi_data');
  end if;

  expected := substr(pi_str, p.digits_correct + 1, 1);

  if digit = expected then
    update public.participants
    set digits_correct = p.digits_correct + 1, last_input_at = now()
    where id = p.id;
    return jsonb_build_object('ok', true, 'correct', true, 'digits', p.digits_correct + 1);
  else
    new_wrong := coalesce(p.wrong_attempts, 0) + 1;
    if new_wrong >= 3 then
      update public.participants
      set wrong_attempts = new_wrong, eliminated = true, last_input_at = now()
      where id = p.id;
      return jsonb_build_object(
        'ok', true, 'correct', false, 'eliminated', true,
        'wrong_attempts', new_wrong, 'digits', p.digits_correct
      );
    else
      update public.participants
      set wrong_attempts = new_wrong, last_input_at = now()
      where id = p.id;
      return jsonb_build_object(
        'ok', true, 'correct', false, 'eliminated', false,
        'wrong_attempts', new_wrong, 'digits', p.digits_correct
      );
    end if;
  end if;
end;
$$;

create or replace function public.admin_start(competition_uuid uuid, secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  comp public.competitions%rowtype;
begin
  select * into comp from public.competitions where id = competition_uuid;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  if comp.admin_secret is distinct from secret then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  update public.competitions
  set status = 'active', started_at = now()
  where id = competition_uuid;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_reset_round(competition_uuid uuid, secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  comp public.competitions%rowtype;
begin
  select * into comp from public.competitions where id = competition_uuid;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  if comp.admin_secret is distinct from secret then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  update public.participants
  set digits_correct = 0, wrong_attempts = 0, eliminated = false, last_input_at = null
  where competition_id = competition_uuid;

  update public.competitions
  set status = 'waiting', started_at = null
  where id = competition_uuid;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_finish(competition_uuid uuid, secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  comp public.competitions%rowtype;
begin
  select * into comp from public.competitions where id = competition_uuid;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  if comp.admin_secret is distinct from secret then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  update public.competitions
  set status = 'finished'
  where id = competition_uuid;

  return jsonb_build_object('ok', true);
end;
$$;

grant usage on schema public to anon, authenticated;

grant select on public.competitions, public.participants to anon, authenticated;

grant execute on function public.join_competition(uuid, text, integer) to anon, authenticated;
grant execute on function public.submit_digit(uuid, text) to anon, authenticated;
grant execute on function public.admin_start(uuid, text) to anon, authenticated;
grant execute on function public.admin_reset_round(uuid, text) to anon, authenticated;
grant execute on function public.admin_finish(uuid, text) to anon, authenticated;

-- Realtime: Dashboard → Database → Publications → supabase_realtime:
-- add tables public.participants (and public.competitions for status updates).
-- Authentication: enable the Anonymous provider so signInAnonymously() works.
