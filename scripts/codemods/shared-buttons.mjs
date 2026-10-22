import {Project,SyntaxKind} from 'ts-morph';
import path from 'node:path';
const project=new Project({skipAddingFilesFromTsConfig:true});project.addSourceFilesAtPaths('apps/web/src/**/*.tsx');
let files=0,buttons=0;
for(const source of project.getSourceFiles()){
 const opens=source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).filter(node=>node.getTagNameNode().getText()==='button');if(!opens.length)continue;
 const existing=source.getImportDeclarations().find(node=>node.getModuleSpecifierValue().endsWith('packages/ui/components'));
 const name='Button';
 if(existing){if(!existing.getNamedImports().some(node=>node.getName()===name))existing.addNamedImport(name);}else{let relative=path.relative(path.dirname(source.getFilePath()),path.resolve('packages/ui/components')).replaceAll(path.sep,'/');if(!relative.startsWith('.'))relative='./'+relative;source.addImportDeclaration({moduleSpecifier:relative,namedImports:[name]});}
 for(const open of opens){const element=open.getParent();open.getTagNameNode().replaceWithText(name);element.getClosingElement().getTagNameNode().replaceWithText(name);buttons++;}files++;
}
await project.save();console.log(JSON.stringify({files,buttons}));
