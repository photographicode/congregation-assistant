import {Project,SyntaxKind} from 'ts-morph';
const project=new Project({skipAddingFilesFromTsConfig:true});
const components=project.addSourceFileAtPath('packages/ui/components.tsx');
components.getFunction('Field')?.remove();
if(!components.getExportDeclarations().some(node=>node.getModuleSpecifierValue()==='./Field'))components.addExportDeclaration({moduleSpecifier:'./Field',namedExports:['Field']});
if(!components.getExportDeclarations().some(node=>node.getModuleSpecifierValue()==='./layout'))components.addExportDeclaration({moduleSpecifier:'./layout',namedExports:['Page','PageHeader','Stack','Inline','Grid','Split','Toolbar','FormRow','TableShell']});
const source=project.addSourceFileAtPath('apps/web/src/features/Dashboard.tsx');
const imports=source.getImportDeclarations().find(node=>node.getModuleSpecifierValue().endsWith('packages/ui/components'));
for(const name of ['Card','Stack','Inline'])if(!imports.getNamedImports().some(node=>node.getName()===name))imports.addNamedImport(name);
let migrated=0;
for(const open of source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)){
 const attribute=open.getAttribute('className');const value=attribute?.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getLiteralValue();
 if(!value)continue;let component,classes=value;
 if(value==='dashboard stack'){component='Stack';classes='dashboard';}
 else if(value==='actions dashboard-context'){component='Inline';classes='dashboard-context';}
 else if(value==='card'||value==='card stack'){component='Card';classes=value.replace(/\bcard\b/,'').trim();}
 if(!component)continue;
 const element=open.getParent();open.getTagNameNode().replaceWithText(component);element.getClosingElement().getTagNameNode().replaceWithText(component);
 if(classes)attribute.setInitializer(JSON.stringify(classes));else attribute.remove();migrated++;
}
await project.save();console.log(JSON.stringify({migrated}));
