#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?Set DATABASE_URL through your secret manager. Never commit it.}"
export PGDATABASE="$DATABASE_URL"
command -v psql >/dev/null || { echo 'Install PostgreSQL client tools first.' >&2; exit 1; }
if [[ "${1:-}" != --apply ]]; then
  psql -X -v ON_ERROR_STOP=1 -f supabase/v2-groups-dry-run.sql
  echo 'Dry run only. Review output; rerun with --apply after taking a backup.'
  exit 0
fi
psql -X -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists ca_migrations;
create table if not exists ca_migrations.applied(name text primary key,applied_at timestamptz not null default now());
SQL
for migration_file in supabase/migrations/*.sql; do
  [[ "$migration_file" == *.down.sql ]] && continue
  if [[ "$migration_file" == *drop_legacy_auth.sql ]] && [[ "${2:-}" != --include-destructive ]]; then
    echo 'Skipping destructive legacy-auth removal. Requires --apply --include-destructive after cutover gates pass.'
    continue
  fi
  migration_name="$(basename "$migration_file")"
  [[ "$migration_name" =~ ^[0-9]{14}_[a-z0-9_]+\.sql$ ]] || { echo "Unexpected migration filename" >&2; exit 1; }
  migration_label="${migration_name#*_}"
  migration_label="${migration_label%.sql}"
  migration_remote_table="$(psql -X -At -v ON_ERROR_STOP=1 -c "select to_regclass('supabase_migrations.schema_migrations') is not null")"
  if [[ "$migration_remote_table" == t ]]; then
    migration_remote_done="$(psql -X -At -v ON_ERROR_STOP=1 -c "select exists(select 1 from supabase_migrations.schema_migrations where name='$migration_label')")"
    if [[ "$migration_remote_done" == t ]]; then
      psql -X -v ON_ERROR_STOP=1 -c "insert into ca_migrations.applied(name) values('$migration_name') on conflict do nothing"
      continue
    fi
  fi
  migration_done="$(psql -X -At -v ON_ERROR_STOP=1 -c "select exists(select 1 from ca_migrations.applied where name='$migration_name')")"
  [[ "$migration_done" == t ]] && continue
  { echo BEGIN\;; [[ "$migration_file" != *drop_legacy_auth.sql ]] || echo "SET LOCAL ca.allow_legacy_auth_drop = 'on';"; cat "$migration_file"; echo "insert into ca_migrations.applied(name) values('$migration_name');"; echo COMMIT\;; } | psql -X -v ON_ERROR_STOP=1
  echo "Applied $migration_name"
done
