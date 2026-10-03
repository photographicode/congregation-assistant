#!/usr/bin/env bash
set -euo pipefail
# Supply these through secure environment bindings; never commit the database URL.
: "${CA_DATABASE_URL:?Connect the new Supabase PostgreSQL URL through secure credential settings}"
: "${CA_OWNER_EMAIL:?Set the verified Google email that will own Superadmin access}"
: "${CA_SUPABASE_URL:?Set the new public Supabase project URL}"
: "${CA_SUPABASE_ANON_KEY:?Set the new public anon or publishable key}"
command -v psql >/dev/null || { echo 'Install the PostgreSQL client (psql) first.'; exit 1; }
cd "$(dirname "$0")/.."
# Transactional fresh-project guard prevents this from running over an existing database.
psql "$CA_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/fresh-project.sql
psql "$CA_DATABASE_URL" -v ON_ERROR_STOP=1 -v owner_email="$CA_OWNER_EMAIL" <<'SQL'
insert into public.ca_superadmins(email) values(lower(trim(:'owner_email')));
SQL
python3 - <<'PY'
import json,os
from pathlib import Path
url=os.environ['CA_SUPABASE_URL'];key=os.environ['CA_SUPABASE_ANON_KEY']
if not url.startswith('https://') or not url.endswith('.supabase.co'):raise SystemExit('Use the HTTPS URL of the new Supabase project.')
# Reject the legacy JWT service-role key; publishable keys are public by design.
if key.startswith('sb_secret_'):raise SystemExit('Use the public anon/publishable key, not a secret key.')
if key.count('.')==2:
 import base64
 payload=json.loads(base64.urlsafe_b64decode(key.split('.')[1]+'==='))
 if payload.get('role')!='anon':raise SystemExit('Only an anon key may be used in browser configuration.')
config=dict(supabaseUrl=url,supabaseAnonKey=key,secureBackend=True,trialDays=30,introductoryAnnualPrice=1499)
Path('app-config.js').write_text('/* Public browser configuration; no server credentials. */\nwindow.CA_CONFIG = Object.freeze('+json.dumps(config,indent=4)+');\n')
PY
echo 'Schema and owner created. Review app-config.js, enable Google provider and redirect URLs, then deploy the app.'
