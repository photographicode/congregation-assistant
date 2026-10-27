import {describe,expect,it} from 'vitest';
import {contactSchema,awaySchema,portalSchema} from '../../packages/core/publisher-workspace';
describe('publisher workspace',()=>{
 it('keeps all contact fields and rejects non-string or oversized edits',()=>{
  expect(contactSchema.parse({phone:' 123 ',address:' Main street ',emergency_name:'Anna',emergency_relationship:'Sister',emergency_phone:'456'}).phone).toBe('123');
  expect(contactSchema.safeParse({phone:123}).success).toBe(false);
  expect(contactSchema.safeParse({phone:'x'.repeat(201)}).success).toBe(false);
 });
 it('rejects impossible dates, reversed periods and overlapping away periods',()=>{
  for(const value of [[{from:'2026-02-30',to:'2026-03-02'}],[{from:'2026-11-12',to:'2026-11-10'}],[{from:'2026-11-01',to:'2026-11-05'},{from:'2026-11-05',to:'2026-11-09'}]])expect(awaySchema.safeParse(value).success).toBe(false);
  expect(awaySchema.parse([{from:'2026-11-12',to:'2026-11-12'}])).toHaveLength(1);
  expect(awaySchema.parse([])).toEqual([]);
 });
 it('accepts the existing RPC shape without inventing submitted or loaded data',()=>{
  const value=portalSchema.parse({name:'Daniel',report:{period:'September 2026',submitted:false},assignments:[],contact:{},scheduleRevision:4});
  expect(value.report.submitted).toBe(false);expect(value.away).toEqual([]);expect(value.contact.address).toBe('');expect(value.scheduleRevision).toBe(4);
  expect(portalSchema.safeParse({report:{submitted:'yes'}}).success).toBe(false);
 });
});
it('loads overlapping historical away periods so publishers can still open their account',()=>{expect(portalSchema.parse({name:'Daniel',report:{submitted:false},contact:{},away:[{from:'2027-03-01',to:'2027-03-05'},{from:'2027-03-04',to:'2027-03-08'}]}).away).toHaveLength(2);});
it('keeps the exact server contact snapshot for optimistic concurrency checks',()=>{const value=portalSchema.parse({name:'Daniel',report:{submitted:false},contact:{phone:' 123 ',address:' Old address '}});expect(value.contact.phone).toBe(' 123 ');expect(value.contact.address).toBe(' Old address ');});
