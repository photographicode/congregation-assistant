import {Project,SyntaxKind} from 'ts-morph';
import path from 'node:path';
const names=new Map([[5000,'notice'],[8000,'noticeWithUndo'],[10000,'undo'],[6000,'delayedRequest'],[15000,'verySlowRequest'],[3000,'probeTimeout'],[20000,'offlineProbe'],[30000,'maintenanceRetry'],[250,'retryBase'],[300,'localSyncDebounce'],[200,'inputDebounce'],[120,'blurDelay']]);
const project=new Project({skipAddingFilesFromTsConfig:true});project.addSourceFilesAtPaths(['apps/web/src/**/*.{ts,tsx}','packages/core/**/*.ts','packages/ui/**/*.{ts,tsx}']);let changed=0;
for(const source of project.getSourceFiles()){
 if(source.getFilePath().endsWith('/packages/core/timing.ts'))continue;let touched=false;
 for(const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)){if(!['setTimeout','setInterval','window.setTimeout','window.setInterval'].includes(call.getExpression().getText()))continue;const delay=call.getArguments()[1];if(!delay?.isKind(SyntaxKind.NumericLiteral))continue;const name=names.get(delay.getLiteralValue());if(!name)continue;delay.replaceWithText('TIMING.'+name);touched=true;changed++;}
 if(touched){let specifier=path.relative(path.dirname(source.getFilePath()),path.resolve('packages/core/timing')).replaceAll(path.sep,'/');if(!specifier.startsWith('.'))specifier='./'+specifier;source.addImportDeclaration({moduleSpecifier:specifier,namedImports:['TIMING']});}
}
await project.save();console.log(JSON.stringify({literalDelaysReplaced:changed}));
