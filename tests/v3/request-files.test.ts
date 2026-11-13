import {describe,expect,it} from 'vitest';
import {FILE_LIMITS,fileProblem,fromBase64,setProblem,toBase64} from '../../apps/web/src/features/request-files';

const text=(s:string)=>new TextEncoder().encode(s);
const kml=text('<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document/></kml>');
const kmz=new Uint8Array([0x50,0x4b,0x03,0x04,1,2,3]);

describe('territory request files',()=>{
 it('accepts real KML and KMZ files',()=>{
  expect(fileProblem('Aroor.KML',kml)).toBe('');
  expect(fileProblem('aroor.kmz',kmz)).toBe('');
 });
 it('rejects other types, renamed files, empty and oversized files',()=>{
  expect(fileProblem('map.pdf',kml)).toMatch(/only KML or KMZ/);
  expect(fileProblem('fake.kml',text('<html>hello</html>'))).toMatch(/not a KML/);
  expect(fileProblem('fake.kmz',kml)).toMatch(/not a KMZ/);
  expect(fileProblem('empty.kml',new Uint8Array())).toMatch(/empty/);
  expect(fileProblem('big.kml',new Uint8Array(FILE_LIMITS.each+1))).toMatch(/4 MB/);
 });
 it('limits the set of files',()=>{
  const f=(name:string,size=10)=>({name,size});
  expect(setProblem([f('a.kml'),f('b.kml'),f('c.kml')])).toBe('');
  expect(setProblem([f('a.kml'),f('b.kml'),f('c.kml'),f('d.kml')])).toMatch(/at most 3/);
  expect(setProblem([f('a.kml'),f('A.KML')])).toMatch(/twice/);
  expect(setProblem([f('a.kml',4e6),f('b.kml',4e6)])).toMatch(/6 MB/);
 });
 it('round-trips large files through base64 without overflowing the stack',()=>{
  const big=new Uint8Array(3*1024*1024).map((_,i)=>i*7%256);
  expect(Buffer.from(fromBase64(toBase64(big))).equals(Buffer.from(big))).toBe(true);
  expect(fromBase64('PGttbD4=\n')).toEqual(text('<kml>'));
 });
});
