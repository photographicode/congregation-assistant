import {z} from 'zod';
export const CONTACT_LIMIT=200,ADDRESS_LIMIT=2000;
const AWAY_LIMIT=50,DATE_LENGTH=10;
const contactText=z.string().trim().max(CONTACT_LIMIT).default('');
export const contactSchema=z.object({phone:contactText,address:z.string().trim().max(ADDRESS_LIMIT).default(''),emergency_name:contactText,emergency_relationship:contactText,emergency_phone:contactText}).strict();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const parsed=new Date(value+'T12:00:00Z');return !Number.isNaN(parsed.valueOf())&&parsed.toISOString().slice(0,DATE_LENGTH)===value;},'Choose a valid calendar date.');
export const savedAwaySchema=z.array(z.object({from:date,to:date}).refine(value=>value.from<=value.to,'The last day must be on or after the first day.'));
export const awaySchema=savedAwaySchema.max(AWAY_LIMIT).superRefine((periods,ctx)=>{
 const sorted=[...periods].sort((a,b)=>a.from.localeCompare(b.from));
 for(let i=1;i<sorted.length;i++){const previous=sorted[i-1],current=sorted[i];if(previous&&current&&current.from<=previous.to)ctx.addIssue({code:'custom',message:'These dates overlap an existing time away. Edit or remove that period first.'});}
});
export const portalSchema=z.object({
 name:z.string().default(''),notice:z.string().nullable().optional(),
 report:z.object({period:z.string().default('Current reporting period'),submitted:z.boolean().default(false)}).passthrough(),
 assignments:z.array(z.object({week:z.string().optional(),date:z.string().optional(),title:z.string().optional(),slot:z.string().optional(),time:z.string().nullable().optional(),isAssistant:z.boolean().optional()}).passthrough()).default([]),
 contact:contactSchema,away:savedAwaySchema.default([]),scheduleRevision:z.number().int().nonnegative().default(0),
}).passthrough();
export const announcementSchema=z.object({id:z.string(),title:z.string(),body:z.string(),created_at:z.string()});
export const notificationSchema=z.object({id:z.string(),publisher_name:z.string(),changed_fields:z.array(z.string()),created_at:z.string(),read_at:z.string().nullable()});
export type PublisherContact=z.infer<typeof contactSchema>;
export type AwayPeriod=z.infer<typeof awaySchema>[number];
export type PublisherPortal=z.infer<typeof portalSchema>;
