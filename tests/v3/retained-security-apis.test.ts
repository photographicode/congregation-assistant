import 'fake-indexeddb/auto';
import {describe,it,expect} from 'vitest';
import {ready,scopeKey,encryptRecord,decryptRecord} from '../../apps/web/src/features/crypto-core.mjs';
import {rememberIdentity,readIdentity} from '../../apps/web/src/features/device-keys';
import {partTypes,lastUsed,assignmentHistory} from '../../packages/core/meeting';
import {publicConfigSchema,featureFlags} from '../../packages/core/config';
import {commandRegistry,canRunCommand} from '../../packages/core/command-registry';
describe('retained security and scheduling APIs',()=>{
 it('authenticates encrypted record context and rejects replay',async()=>{
  expect(typeof (await ready()).crypto_box_keypair).toBe('function');
  const key=await scopeKey(),meta={cong_id:'fictional',scope:'reports',kind:'report',record_id:'fixture',epoch:1,revision:2,schema_version:1};
  const record=await encryptRecord(key,{hours:3},meta);
  expect(await decryptRecord(key,record)).toEqual({hours:3});
  await expect(decryptRecord(key,{...record,meta:{...meta,cong_id:'other'}})).rejects.toThrow();
  await expect(decryptRecord(key,record,3)).rejects.toThrow(/replay/i);
 });
 it('keeps device identity isolated by account',async()=>{
  await rememberIdentity('fictional-one',{name:'Fictional key material'});
  expect(await readIdentity('fictional-one')).toEqual({name:'Fictional key material'});
  expect(await readIdentity('fictional-other')).toBeNull();
 });
 it('excludes future/cancelled assignments from recency',()=>{
  const assignments={'2024-W01':{a:{personId:'one',assignmentType:'Prayer'}},'2026-W01':{a:{personId:'one',assignmentType:'Prayer'}},'2026-W02':{a:{personId:'one',assignmentType:'Prayer',status:'cancelled'}},'2026-W40':{a:{personId:'one',assignmentType:'BibleReading'}},'2026-W45':{a:{personId:'one',assignmentType:'Prayer'}}};
  expect(lastUsed('one','Prayer','2026-W41',assignments)).toBe('2026-W01');
  expect(assignmentHistory('one','2026-W41',assignments)).toEqual({overall:'2026-W40',overallType:'BibleReading',count:2});
  expect(new Set(partTypes).size).toBe(partTypes.length);expect(partTypes).toContain('BibleStudyReader');
 });
 it('keeps activation flags typed and owned',()=>{
  for(const [name,metadata]of Object.entries(featureFlags)){expect(metadata.owner).toBeTruthy();expect(Number.isFinite(Date.parse(metadata.expires))).toBe(true);expect(publicConfigSchema.shape[name as keyof typeof featureFlags].safeParse(true).success).toBe(true);}
 });
 it('does not grant command authority to publishers or unknown roles',()=>{
  for(const command of commandRegistry){expect(canRunCommand(command,['publisher'])).toBe(false);expect(canRunCommand(command,[])).toBe(false);expect(canRunCommand(command,['unknown'])).toBe(false);expect(canRunCommand(command,['admin'])).toBe(true);}
 });
});
