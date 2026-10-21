import {rpc,demo} from './client';
export async function createReportLink(cong:string,kind:'report'|'attendance',group:string|null){
 if(demo)return {token:'fictional-preview-only'};
 return rpc('create_public_link',{p_cong_id:cong,p_kind:kind,p_group:kind==='report'?group:null,p_pub_id:null});
}
export async function manageGroupLink(cong:string,token:string,action:'rotate'|'revoke'){
 if(demo)return null;
 return rpc('ca_v3_manage_group_link',{p_cong_id:cong,p_token:token,p_action:action});
}
