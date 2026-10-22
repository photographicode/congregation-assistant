import {Project,SyntaxKind,Node} from 'ts-morph';
const project=new Project({skipAddingFilesFromTsConfig:true});project.addSourceFilesAtPaths('apps/web/src/**/*.tsx');let labelled=0;
for(const source of project.getSourceFiles())for(const select of source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)){
 if(select.getTagNameNode().getText()!=='LegacySelect'||select.getAttribute('aria-label'))continue;
 const label=select.getFirstAncestor(node=>Node.isJsxElement(node)&&node.getOpeningElement().getTagNameNode().getText()==='label');if(!label)continue;
 const text=label.getJsxChildren().find(node=>Node.isJsxExpression(node)&&node.getExpression());
 if(text&&Node.isJsxExpression(text)){select.addAttribute({name:'aria-label',initializer:'{'+text.getExpression().getText()+'}'});labelled++;}
}
await project.save();console.log(JSON.stringify({customSelectLabelsAdded:labelled}));
