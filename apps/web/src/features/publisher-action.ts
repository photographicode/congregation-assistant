import {rpc,demo} from './client';
export async function savePublisherAction(congregation:string,person:Record<string,unknown>,shared:boolean,roles:readonly string[]){
 if(!roles.includes('admin'))throw Error('That needs an administrator.');
 if(!demo)await rpc('ca_v3_save_person',{p_cong_id:congregation,p_person:person,p_shared:shared});
 return person;
}
