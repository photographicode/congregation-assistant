import {Project,SyntaxKind} from 'ts-morph';
import path from 'node:path';
const project=new Project({skipAddingFilesFromTsConfig:true});project.addSourceFilesAtPaths(['apps/web/src/**/*.{ts,tsx}','packages/core/**/*.ts','packages/ui/**/*.{ts,tsx}']);let changed=0;
for(const source of project.getSourceFiles()){
 if(source.getFilePath().endsWith('/packages/core/errors.ts'))continue;
 const empty=source.getDescendantsOfKind(SyntaxKind.CatchClause).filter(clause=>clause.getBlock().getStatements().length===0);const promiseCatches=source.getDescendantsOfKind(SyntaxKind.CallExpression).filter(call=>call.getExpression().isKind(SyntaxKind.PropertyAccessExpression)&&call.getExpression().getName()==='catch').map(call=>call.getArguments()[0]).filter(callback=>callback?.isKind(SyntaxKind.ArrowFunction)&&callback.getBody().isKind(SyntaxKind.Block)&&callback.getBody().getStatements().length===0);if(!empty.length&&!promiseCatches.length)continue;
 let specifier=path.relative(path.dirname(source.getFilePath()),path.resolve('packages/core/errors')).replaceAll(path.sep,'/');if(!specifier.startsWith('.'))specifier='./'+specifier;
 const existing=source.getImportDeclaration(specifier);if(existing){if(!existing.getNamedImports().some(node=>node.getName()==='handleError'))existing.addNamedImport('handleError');}else source.addImportDeclaration({moduleSpecifier:specifier,namedImports:['handleError']});
 const callbackScope=path.relative(path.resolve('apps/web/src'),source.getFilePath()).replaceAll(path.sep,'/');
 for(const callback of promiseCatches){callback.replaceWithText(`(error)=>{handleError(error,{scope:${JSON.stringify(callbackScope)},severity:'warning'});}`);changed++;}
 for(const clause of [...empty].reverse()){
 const variable=clause.getVariableDeclaration()?.getName()||'error';
 const scope=path.relative(path.resolve('apps/web/src'),source.getFilePath()).replaceAll(path.sep,'/');
 clause.replaceWithText(`catch (${variable}) { handleError(${variable}, {scope:${JSON.stringify(scope)},severity:'warning'}); }`);changed++;
 }
}
await project.save();console.log(JSON.stringify({emptyCatchesReplaced:changed}));
