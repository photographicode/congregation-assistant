// Cache lifetime follows the authenticated account, not the congregation ID alone.
export function authScope(queryClient,onChange=()=>{}){let account=null;return session=>{const next=session?.user?.id||null;if(next!==account){queryClient.clear();onChange();}account=next;};}
