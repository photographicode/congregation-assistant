import {readFile} from 'node:fs/promises';
const source=await readFile('osv-scanner.toml','utf8'),now=new Date(),DAY=86400000,MAX_DAYS=90;
const sections=source.split('[[IgnoredVulns]]').slice(1);
for(const section of sections){const id=section.match(/^id\s*=\s*"([^"]+)"/m)?.[1],until=section.match(/^ignoreUntil\s*=\s*(\d{4}-\d{2}-\d{2})/m)?.[1],reason=section.match(/^reason\s*=\s*"([^"]+)"/m)?.[1];const expiry=new Date(until+'T00:00:00Z');if(!id||!/^GHSA-[a-z0-9-]+$|^CVE-\d{4}-\d+$/.test(id)||!reason||reason.length<80||!until||!Number.isFinite(+expiry)||expiry<=now||expiry-now>MAX_DAYS*DAY)throw Error('Every advisory needs an explicit reviewed reason and future expiry within 90 days');}
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
if(sections.some(section=>section.includes('GHSA-vfj7-8cjw-p6xm'))){const braces=lock.packages['node_modules/braces'];if(braces?.version!=='3.0.3'||braces.dev!==true)throw Error('braces advisory review must be renewed for a changed graph');const sbom=JSON.parse(await readFile('work/security/sbom.json','utf8'));if(sbom.components.some(c=>c.name==='braces'))throw Error('braces exception requires absence from production SBOM');}
console.log('PASS advisory-specific reviews, expiry <=90 days and production-graph condition:',sections.length);
