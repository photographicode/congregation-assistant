import {describe,expect,it} from 'vitest';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
function files(root:string):string[]{return readdirSync(root).flatMap(name=>{const path=join(root,name);return statSync(path).isDirectory()?files(path):path.endsWith('.tsx')?[path]:[];});}
describe('custom selection controls',()=>{
 it('does not allow native select elements back into application source',()=>{
  const offenders=files('apps/web/src').filter(path=>/<\/?select\b/i.test(readFileSync(path,'utf8')));
  expect(offenders).toEqual([]);
 });
});
