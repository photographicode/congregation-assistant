# Reviewed historical scanner findings

The first full-history Gitleaks scan found nine historical entries. Five are public Supabase anon JWTs, confirmed by decoding only the role/issuer metadata (anon/supabase). Two are ordinary English UI/documentation text caught by generic keyword matching. Two are browser-only MASTER_PASSWORD constants in retired pre-Google HTML implementations. The native shipped application does not load or authorize through those constants. They are not external provider API keys; the old HTML is excluded from the production bundle.

.gitleaksignore records only the exact commit/file/rule/line fingerprints of these reviewed entries. It does not ignore a path, JWTs generally, new password constants, service-role keys, or future findings. The immutable v1-final tag and Git history were not rewritten. No secret values are reproduced in this document or baseline. Server Google role/RLS tests remain an independent release gate.
