import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function licenseAllowed(expression,allowed,exceptions=new Set()){
 if(typeof expression!=='string'||expression.length>4096)return false;
 const tokens=expression.match(/\(|\)|[A-Za-z0-9.+:-]+/g)||[];
 if(tokens.length>1024||tokens.join('')!==expression.replace(/\s/g,''))return false;
 let index=0;
 function atom(depth){if(depth>20)throw Error('Licence expression nesting limit.');if(tokens[index]==='('){index++;const value=or(depth+1);if(tokens[index++]!==')')throw Error('Unbalanced licence expression.');return value;}const name=tokens[index++];if(!name||['AND','OR','WITH',')'].includes(name))throw Error('Invalid licence expression.');let value=allowed.has(name);if(tokens[index]==='WITH'){index++;const exception=tokens[index++];value=value&&exceptions.has(exception);}return value;}
 function and(depth){let value=atom(depth);while(tokens[index]==='AND'){index++;const right=atom(depth);value=value&&right;}return value;}
 function or(depth){let value=and(depth);while(tokens[index]==='OR'){index++;const right=and(depth);value=value||right;}return value;}
 try{const result=or(0);return result&&index===tokens.length;}catch{return false;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const policy=JSON.parse(await readFile('.github/license-policy.json','utf8'));
 const sbom=JSON.parse(await readFile(process.argv[2]||'work/security/sbom.json','utf8'));
 const allowed=new Set(policy.allowed),failures=[];let firstParty=0;
 const ownLicense=await readFile(policy.firstParty.license,'utf8');if(!ownLicense.includes('All rights reserved'))throw Error('First-party licence policy must be reviewed.');
 const ownVersions=new Map(await Promise.all(Object.entries(policy.firstParty.packages).map(async([name,file])=>[name,JSON.parse(await readFile(file,'utf8')).version])));
 for(const component of sbom.components||[]){if(component.group===policy.firstParty.group&&ownVersions.get(component.name)===component.version){firstParty++;continue;}const licenses=component.licenses||[];if(!licenses.some(item=>licenseAllowed(item.license?.id||item.expression,allowed)))failures.push({name:component.name,version:component.version,licenses});}
 if(!sbom.components?.length)throw Error('No production components found in SBOM.');
 if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1;}else console.log('PASS production licence allow-list:',sbom.components.length-firstParty,'third-party components;',firstParty,'first-party components retain the root LICENSE');
}
