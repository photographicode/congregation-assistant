import {Project,SyntaxKind} from 'ts-morph';
import postcss from 'postcss';
import {readFile,writeFile} from 'node:fs/promises';
const project=new Project({skipAddingFilesFromTsConfig:true});
const source=project.addSourceFileAtPath('apps/web/src/features/Dashboard.tsx');
const table=source.getDescendantsOfKind(SyntaxKind.JsxElement).find(node=>node.getOpeningElement().getAttribute('className')?.getText()==='className="people-table"');
const labels=['Name','Roles','Report','Studies','Hours','Actions'];
for(const row of table.getDescendantsOfKind(SyntaxKind.JsxElement).filter(node=>node.getOpeningElement().getTagNameNode().getText()==='tr')){
 const cells=row.getJsxChildren().filter(node=>node.getKind()===SyntaxKind.JsxElement&&['th','td'].includes(node.getOpeningElement().getTagNameNode().getText()));
 if(cells.every(cell=>cell.getOpeningElement().getTagNameNode().getText()==='th'))continue;
 for(const [index,cell]of cells.entries())if(!cell.getOpeningElement().getAttribute('data-label'))cell.getOpeningElement().addAttribute({name:'data-label',initializer:JSON.stringify(labels[index])});
}
await project.save();
const cssFile='apps/web/src/features/styles.css',css=postcss.parse(await readFile(cssFile,'utf8'));
const rules=[];css.walkRules(rule=>{if(rule.selector.startsWith('.people-table')){rules.push(rule.toString());rule.remove();}if(rule.selector==='.assistant-device-privacy')rule.walkDecls('text-align',decl=>{decl.value='left';});});
await writeFile(cssFile,css.toString());
if(!rules.length)process.exit(0);
await writeFile('packages/ui/people-table.css',`/* Responsive publisher spreadsheet; narrow containers show labelled rows. */\n${rules.join('\n').replace('min-width:720px;','').replace('padding:.8rem .65rem','padding:var(--space-3) var(--space-2)').replace('z-index:1','z-index:var(--z-sticky)')}\n.people-table-wrap{container-type:inline-size}\n@container (width < 45rem){
 .people-table,.people-table tbody,.people-table tfoot{display:block;width:100%}
 .people-table thead{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden}
 .people-table tr{display:grid;grid-template-columns:minmax(0,1fr);padding-block:var(--space-3)}
 .people-table td,.people-table tfoot th{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:var(--space-2);min-width:0;overflow-wrap:anywhere;text-align:left}
 .people-table td::before,.people-table tfoot th::before{content:attr(data-label);font-weight:600;color:var(--text-2)}
 .people-table .row-actions{flex-wrap:wrap;min-width:0}
}\n`);
