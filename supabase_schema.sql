-- Tabelle fuer Testergebnisse
create table if not exists test_results (
  id              uuid        default gen_random_uuid() primary key,
  created_at      timestamptz default now() not null,
  round           int         not null,
  hits            int         not null,
  targets         int         not null,
  misses          int         not null,
  false_alarms    int         not null,
  avg_reaction_ms float,
  accuracy        int         not null,
  symbol_speed_ms int         not null
);

-- Row Level Security aktivieren (Lesen fuer alle, Schreiben via anon key erlaubt)
alter table test_results enable row level security;

create policy "Anon darf einfuegen"
  on test_results for insert
  to anon
  with check (true);

create policy "Anon darf lesen"
  on test_results for select
  to anon
  using (true);
