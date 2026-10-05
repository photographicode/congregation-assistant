create index if not exists ca_push_outbox_subscription_idx on ca_private.push_outbox(subscription_id);
create index if not exists ca_trial_requests_congregation_idx on ca_private.trial_requests(cong_id);
