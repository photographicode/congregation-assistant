import {z} from 'zod';
const fields={name:z.string().trim().min(1).max(200),gender:z.enum(['Male','Female']),dob:z.iso.date(),baptized:z.iso.date(),phone:z.string().max(40),email:z.union([z.email(),z.literal('')]),address:z.string().max(2000),service_group:z.string().max(200),emergencyName:z.string().max(300),emergencyRelationship:z.string().max(300),emergencyPhone:z.string().max(30),is_elder:z.boolean(),is_ms:z.boolean(),is_rp:z.boolean(),is_sp:z.boolean(),is_fm:z.boolean(),is_sfts:z.boolean()};
type PublisherField=keyof typeof fields;
export type PublisherEditPlan={kind:'publisher-edit';people:{id:string;name:string}[];field:PublisherField;value:string|boolean};
const aliases:Record<string,PublisherField>={'name':'name','gender':'gender','date of birth':'dob','dob':'dob','birth date':'dob','baptism':'baptized','date of baptism':'baptized','baptism date':'baptized','phone':'phone','phone number':'phone','email':'email','address':'address','group':'service_group','emergency contact name':'emergencyName','emergency relationship':'emergencyRelationship','emergency phone':'emergencyPhone','elder':'is_elder','ministerial servant':'is_ms','regular pioneer':'is_rp','special pioneer':'is_sp','field missionary':'is_fm','sfts':'is_sfts'};
export function publisherCommand(input:string,people:{id:string;name:string}[]):PublisherEditPlan|null{
 const match=input.trim().match(/^(?:please\s+)?(?:set|update|change|edit)\s+(.+?)(?:’s|'s)?\s+(date of baptism|date of birth|baptism date|birth date|phone number|ministerial servant|regular pioneer|special pioneer|field missionary|emergency contact name|emergency relationship|emergency phone|name|gender|dob|baptism|phone|email|address|group|elder|sfts)\s+(?:to\s+|=\s*)?(.+)$/i);
 if(!match)return null;
 const [,matchedName,matchedField,matchedValue]=match;
 if(!matchedName||!matchedField||!matchedValue)return null;
 const name=matchedName.replace(/[’']s$/i,'').toLocaleLowerCase('en').trim();const exact=people.filter(person=>person.name.toLocaleLowerCase('en')===name);const matches=exact.length?exact:people.filter(person=>person.name.toLocaleLowerCase('en').split(/\s+/).includes(name));if(!matches.length)throw Error('No accessible publisher matched. Use the full name.');
 const field=aliases[matchedField.toLowerCase()];if(!field)return null;let value:string|boolean=matchedValue.trim();
 if(field==='dob'||field==='baptized'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)){const named=value.match(/^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);const day=named?.[1],month=named?.[2],year=named?.[3];if(!day||!month||!year)throw Error('Use YYYY-MM-DD or a date such as 4 May 2019.');const months=['january','february','march','april','may','june','july','august','september','october','november','december'];value=`${year}-${String(months.indexOf(month.toLowerCase())+1).padStart(2,'0')}-${day.padStart(2,'0')}`;}
  if(value>new Date().toISOString().slice(0,10))throw Error('This date cannot be in the future.');
 }else if(field.startsWith('is_')){if(!/^(yes|no|true|false|on|off)$/i.test(value))throw Error('Use yes or no for this field.');value=/^(yes|true|on)$/i.test(value);}else if(field==='gender'){value=/^(male|brother)$/i.test(value)?'Male':/^(female|sister)$/i.test(value)?'Female':value;}
 const validated=fields[field].parse(value);return {kind:'publisher-edit',people:matches,field,value:validated};
}
