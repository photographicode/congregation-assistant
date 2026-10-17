-- Presentation-only expansion; preserve every existing identity/role/revision check.
do $migration$
declare original text;updated text;begin
 original=pg_get_functiondef('public.ca_v2_save_experience(text,jsonb,bigint)'::regprocedure);
 if position('''mono-light''' in original)>0 and position('Choose a whole-number background intensity' in original)>0 then return;end if;
 updated=replace(original,'''clock'']','''clock'',''backgroundIntensity'']');
 updated=replace(updated,'''glass-graphite'')','''glass-graphite'',''mono-light'',''mono-dark'',''lagoon-glass'',''neon-night'',''sunset-pop'',''neo-brutal'',''forest'',''aurora'')');
 updated=replace(updated,' perform ca_private.v2_experience_access(p_cong_id);',E' perform ca_private.v2_experience_access(p_cong_id);\n if p_preferences ? ''backgroundIntensity'' then\n  if jsonb_typeof(p_preferences->''backgroundIntensity'') is distinct from ''number'' then raise exception ''Choose a background intensity from 0 to 100'';end if;\n  if (p_preferences->>''backgroundIntensity'')::numeric not between 0 and 100 or (p_preferences->>''backgroundIntensity'')::numeric<>trunc((p_preferences->>''backgroundIntensity'')::numeric) then raise exception ''Choose a whole-number background intensity from 0 to 100'';end if;\n end if;');
 if updated=original or position('''mono-light''' in updated)=0 or position('''backgroundIntensity''' in updated)=0 then raise exception 'Experience contract differs from expected baseline; no change applied';end if;
 execute updated;
end $migration$;
