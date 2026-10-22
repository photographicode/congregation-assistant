import {Project,SyntaxKind,Node} from 'ts-morph';
import path from 'node:path';
const project=new Project({tsConfigFilePath:'apps/web/tsconfig.json',skipAddingFilesFromTsConfig:true});
project.addSourceFilesAtPaths(['apps/web/src/**/*.tsx','packages/ui/**/*.tsx']);
let changed=0,submit=0;
for(const source of project.getSourceFiles()){
 const buttons=source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).filter(node=>node.getTagNameNode().getText()==='button');
 const forms=source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).filter(node=>node.getTagNameNode().getText()==='form'&&node.getAttribute('onSubmit'));
 const primary=new Set();
 for(const form of forms){const candidates=buttons.filter(button=>button.getFirstAncestor(parent=>Node.isJsxElement(parent)&&parent.getOpeningElement().getTagNameNode().getText()==='form')===form.getParent()&&!button.getAttribute('onClick'));const last=candidates.at(-1);if(last)primary.add(last);}
 for(const button of buttons){if(button.getAttribute('type'))continue;const type=primary.has(button)?'submit':'button';button.addAttribute({name:'type',initializer:JSON.stringify(type)});changed++;if(type==='submit')submit++;}
 // The shared primitive deliberately remains a native button, preserving callers' explicit submit type.
 if(source.getFilePath().endsWith('/packages/ui/components.tsx')){const native=buttons.find(button=>button.getFirstAncestorByKind(SyntaxKind.FunctionExpression)?.getName()==='Button');if(native){native.getAttribute('type')?.remove();native.addAttribute({name:'type',initializer:'{props.type ?? "button"}'});}}
}
await project.save();console.log(JSON.stringify({explicitTypesAdded:changed,formSubmitButtons:submit}));
