import {Project,SyntaxKind} from 'ts-morph';
import path from 'node:path';
const project=new Project({skipAddingFilesFromTsConfig:true});project.addSourceFilesAtPaths(['apps/web/src/**/*.{ts,tsx}','packages/core/**/*.ts','packages/ui/**/*.{ts,tsx}']);let changed=0;
for(const source of project.getSourceFiles()){
 if(source.getFilePath().endsWith('/packages/core/storage.ts'))continue;
 const accesses=source.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).filter(node=>['getItem','setItem','removeItem'].includes(node.getName())&&['localStorage','window.localStorage','globalThis.localStorage'].includes(node.getExpression().getText()));if(!accesses.length)continue;
 let specifier=path.relative(path.dirname(source.getFilePath()),path.resolve('packages/core/storage')).replaceAll(path.sep,'/');if(!specifier.startsWith('.'))specifier='./'+specifier;
 source.addImportDeclaration({moduleSpecifier:specifier,namedImports:['preferenceStorage']});
 for(const access of accesses){access.getExpression().replaceWithText('preferenceStorage');changed++;}
}
await project.save();console.log(JSON.stringify({rawPreferenceCallsMigrated:changed}));
