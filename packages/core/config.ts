import {ignoreError} from './errors';
import {z} from 'zod';
const httpsUrl=z.url().refine(value=>new URL(value).protocol==='https:','Use an HTTPS origin.');
const MIN_PUBLIC_KEY_LENGTH=16;
const publicKey=z.string().min(MIN_PUBLIC_KEY_LENGTH).refine(value=>!value.startsWith('sb_secret_'),'A secret key cannot be used by the browser.');
export const publicConfigSchema=z.object({
 SUPPORT_EMAIL:z.email(),SECURITY_EMAIL:z.email(),
 PUBLIC_SITE_URL:httpsUrl,APP_URL:httpsUrl,SITE_URL:httpsUrl.optional(),
 SUPABASE_URL:httpsUrl,SUPABASE_PUBLISHABLE_KEY:publicKey,
 BASE_URL:z.string().refine(value=>value.startsWith('/')&&!value.startsWith('//')&&!value.includes('..')&&!/[?#]/.test(value),'Use a local application base path.'),
 domainConfigured:z.boolean().default(false),mailConfigured:z.boolean().default(false),
 GITHUB_PAGES_SITE_URL:httpsUrl.optional(),GITHUB_PAGES_SOURCE_URL:httpsUrl.optional(),
}).passthrough();
export type PublicConfig=z.infer<typeof publicConfigSchema>;
export const featureFlags={
 domainConfigured:{owner:'repository-owner',expires:'2027-01-01',description:'Custom-domain activation after DNS and callback verification.'},
 mailConfigured:{owner:'repository-owner',expires:'2027-01-01',description:'Mail provider activation after delivery verification.'},
} as const;
export function validatePublicConfig(value:unknown):PublicConfig{
 const result=publicConfigSchema.safeParse(value);
 if(!result.success)throw new Error('Application configuration is invalid. Contact the administrator.');
 const key=result.data.SUPABASE_PUBLISHABLE_KEY;
 if(key.startsWith('sb_publishable_'))return result.data;
 // Legacy JWT keys are accepted only when their public anon role can be inspected.
 try{
  const payload=key.split('.')[1];if(!payload)throw new Error('Missing key payload.');
  const claims:unknown=JSON.parse(atob(payload.replaceAll('-','+').replaceAll('_','/')));
  if(!z.object({role:z.literal('anon')}).safeParse(claims).success)throw new Error('Not a public key.');
 }catch(error){ignoreError('Invalid public-key payload is rejected without logging its contents.');throw new Error('Only a publishable or legacy anonymous key is permitted.');}
 return result.data;
}
