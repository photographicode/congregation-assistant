import {Project,SyntaxKind} from 'ts-morph';
const project=new Project({useInMemoryFileSystem:false});
const file=project.addSourceFileAtPath('apps/web/src/features/Workspace.tsx');let count=0;
for(const node of file.getDescendantsOfKind(SyntaxKind.ElementAccessExpression)){
 if(node.getArgumentExpression()?.getText()!=='0')continue;
 if(!['s','key','f'].includes(node.getExpression().getText()))continue;
 if(!node.getParentIfKind(SyntaxKind.PropertyAccessExpression)?.getText().endsWith('.toUpperCase'))continue;
 node.replaceWithText(node.getExpression().getText()+'.charAt(0)');count++;
}
await file.save();console.log('Converted bounded string-label index reads:',count);
