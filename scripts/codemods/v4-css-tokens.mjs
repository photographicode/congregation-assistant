// Consolidate the former feature stylesheet onto the shared typography/radius scale.
import {readFile,writeFile} from 'node:fs/promises';import postcss from 'postcss';import {transform} from 'esbuild';
const file='apps/web/src/features/styles.css',root=postcss.parse(await readFile(file,'utf8'));
root.walkDecls('font-size',decl=>{const value=decl.value;if(/^[.\d]+(?:em|rem)$/.test(value)){const size=parseFloat(value);decl.value=`var(--fs-${size<=.76?1:size<=.9?2:size<=1.05?3:size<=1.2?4:size<=1.4?5:size<=1.6?6:size<=2?7:8})`;}});
root.walkDecls('border-radius',decl=>{if(/^[.\d]+rem$/.test(decl.value))decl.value='var(--radius-m)';});
await writeFile(file,(await transform(root.toString(),{loader:'css',minify:true})).code);
