import type {SupabaseClient} from '@supabase/supabase-js';
import type {Transport} from './store';
// The SDK data API is confined to this adapter. Auth remains a separate concern.
export function plainTransport(client:SupabaseClient):Transport{return {
 async read(source){if(source.kind==='rpc'){const {data,error}=await client.rpc(source.name,source.args);if(error)throw error;return data;}
  let request=client.from(source.name).select(source.columns);
  for(const filter of source.filters||[])request=filter.op==='is'?request.is(filter.column,filter.value as null):request.eq(filter.column,filter.value);
  if(source.order)request=request.order(source.order,{ascending:source.ascending??true});if(source.offset!==undefined)request=request.range(source.offset,source.offset+(source.limit??1000)-1);else if(source.limit)request=request.limit(source.limit);
  const {data,error}=await request;if(error)throw error;return data;
 },
 async write(mutation){if(mutation.kind==='rpc'){const {data,error}=await client.rpc(mutation.name,mutation.args);if(error)throw error;return data;}
  let request=mutation.kind==='upsert'?client.from(mutation.name).upsert(mutation.value,{onConflict:mutation.conflict}):client.from(mutation.name).update(mutation.value);
  for(const filter of mutation.filters||[])request=filter.op==='is'?request.is(filter.column,filter.value as null):request.eq(filter.column,filter.value);
  const {data,error}=await request;if(error)throw error;return data;
 }
};}
