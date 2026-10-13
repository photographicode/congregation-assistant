// Package compiled runtime into the existing main/root GitHub Pages tree.
// Run npm run build:v2 first; review and commit these generated outputs.
import {cp,rm,mkdir} from 'node:fs/promises';
for(const dir of ['v2','site']){await rm(dir,{recursive:true,force:true});await cp('dist/'+dir,dir,{recursive:true});}
await mkdir('.well-known',{recursive:true});await cp('dist/.well-known/build-hash.txt','.well-known/build-hash.txt');
console.log('Prepared v2/, site/ and public build hash for existing Pages hosting.');
