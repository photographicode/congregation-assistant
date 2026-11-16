import {describe,expect,it} from 'vitest';
import {FILE_LIMITS,fileProblem,fromBase64,setProblem,toBase64} from '../../apps/web/src/features/request-files';

const text=(s:string)=>new TextEncoder().encode(s);
const kml=text('<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document/></kml>');
const kmz=new Uint8Array([0x50,0x4b,0x03,0x04,1,2,3]);

describe('territory request files',()=>{
 it('accepts a real KML file',()=>{
  expect(fileProblem('Aroor.KML',kml)).toBe('');
 });
 it('rejects other types, renamed files, empty and oversized files',()=>{
  expect(fileProblem('map.pdf',kml)).toMatch(/only a \.kml file/);
  expect(fileProblem('aroor.kmz',kmz)).toMatch(/only a \.kml file/);
  expect(fileProblem('fake.kml',text('<html>hello</html>'))).toMatch(/not a KML/);
  expect(fileProblem('empty.kml',new Uint8Array())).toMatch(/empty/);
  expect(fileProblem('big.kml',new Uint8Array(FILE_LIMITS.each+1))).toMatch(/5 MB/);
  expect(FILE_LIMITS.each).toBe(5*1024*1024);
 });
 it('takes exactly one file',()=>{
  const f=(name:string,size=10)=>({name,size});
  expect(setProblem([f('a.kml')])).toBe('');
  expect(setProblem([f('a.kml'),f('b.kml')])).toMatch(/one KML/);
 });
 it('round-trips large files through base64 without overflowing the stack',()=>{
  const big=new Uint8Array(3*1024*1024).map((_,i)=>i*7%256);
  expect(Buffer.from(fromBase64(toBase64(big))).equals(Buffer.from(big))).toBe(true);
  expect(fromBase64('PGttbD4=\n')).toEqual(text('<kml>'));
 });
});
