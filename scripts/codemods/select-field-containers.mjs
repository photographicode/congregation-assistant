import {Project,SyntaxKind,Node} from 'ts-morph';
const project=new Project({skipAddingFilesFromTsConfig:true});project.addSourceFilesAtPaths('apps/web/src/**/*.tsx');let changed=0;
for(const source of project.getSourceFiles()){
 const parents=new Set();for(const select of source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)){if(select.getTagNameNode().getText()!=='LegacySelect')continue;const label=select.getFirstAncestor(node=>Node.isJsxElement(node)&&node.getOpeningElement().getTagNameNode().getText()==='label');if(label)parents.add(label);}
 for(const label of parents){const first=label.getJsxChildren().find(node=>Node.isJsxExpression(node)&&node.getExpression());const select=label.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).find(node=>node.getTagNameNode().getText()==='LegacySelect');const explicit=select?.getAttribute('aria-label')?.getInitializer()?.getText();if(first&&explicit==='{'+first.getExpression().getText()+'}')first.replaceWithText('');label.getOpeningElement().getTagNameNode().replaceWithText('div');label.getClosingElement().getTagNameNode().replaceWithText('div');if(!label.getOpeningElement().getAttribute('className'))label.getOpeningElement().addAttribute({name:'className',initializer:'"ui-field"'});changed++;}
}
await project.save();console.log(JSON.stringify({customPickerNativeLabelsReplaced:changed}));
