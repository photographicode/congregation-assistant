import {Project,SyntaxKind} from 'ts-morph';
import path from 'node:path';
const project=new Project({skipAddingFilesFromTsConfig:true});project.addSourceFilesAtPaths('apps/web/src/**/*.{ts,tsx}');let changed=0;
const main=project.getSourceFileOrThrow('apps/web/src/main.tsx');const context=main.getTypeAliasOrThrow('Context');context.remove();main.addImportDeclaration({moduleSpecifier:'./context',isTypeOnly:true,namedImports:['Context']});main.addExportDeclaration({moduleSpecifier:'./context',isTypeOnly:true,namedExports:['Context']});
for(const source of project.getSourceFiles())for(const declaration of source.getImportDeclarations())if(/(?:^|\/)main$/.test(declaration.getModuleSpecifierValue())&&declaration.getNamedImports().some(node=>node.getName()==='Context')){let relative=path.relative(path.dirname(source.getFilePath()),path.resolve('apps/web/src/context')).replaceAll(path.sep,'/');if(!relative.startsWith('.'))relative='./'+relative;declaration.setModuleSpecifier(relative);changed++;}
await project.save();console.log(JSON.stringify({entryPointTypeImportsRemoved:changed}));
