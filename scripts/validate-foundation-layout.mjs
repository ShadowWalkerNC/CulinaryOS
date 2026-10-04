import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const targetPaths = [
 'apps/pos','apps/kds','apps/admin','apps/customer-web','apps/mobile',
 'modules/prep','modules/ops','modules/marketing','modules/web','modules/intelligence',
 'domain/orders','domain/inventory','domain/payments','domain/employees','domain/restaurants',
 'packages/contracts','packages/events','packages/ui','packages/auth','packages/db','packages/sdk','packages/config',
 'services/marketing-python','integrations/ai','integrations/muse','integrations/mercury','integrations/deployment','integrations/payments',
 'api','cli','mcp','tooling','docs',
];
export function validateLayout(root) {
 const errors=[];
 const base=fs.realpathSync(root);
 function contained(relative) {
  if (typeof relative!=='string' || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(p=>p==='..'||p==='.'||p==='')) throw Error('unsafe relative path');
  const full=fs.realpathSync(path.join(base,relative));
  const rel=path.relative(base,full);
  if (rel==='..'||rel.startsWith(`..${path.sep}`)||path.isAbsolute(rel)) throw Error('reference escapes root');
  return full;
 }
 const domainSets={
  'modules/prep':['recipes','prep_tasks'],'modules/ops':['labor','vendors','purchasing','waste'],
  'modules/marketing':['campaigns','social_publishing'],'modules/web':['website_content','website_themes'],
  'modules/intelligence':['recommendations'],'domain/orders':['orders'],'domain/inventory':['inventory'],
  'domain/payments':['payments'],'domain/restaurants':['restaurant_configuration'],
 };
 const plannedOnly=new Set(['modules/intelligence','services/marketing-python','integrations/ai','integrations/muse','integrations/mercury','integrations/deployment','docs']);
 const keys=new Set(['schemaVersion','phase','path','kind','owner','purpose','implementationStatus','runtimeEntrypoint','grantedPermissions','dataDomainRefs','ownershipSource','references','dependencyDirection','runtimeOwnershipEnforcement','migrationAuthorized']);
 try {
  const registry=JSON.parse(fs.readFileSync(contained('docs/architecture/foundation-layout.json'),'utf8'));
  const ownership=JSON.parse(fs.readFileSync(contained('docs/architecture/culinary-foundation.json'),'utf8'));
  const owners=new Map(ownership.dataOwnership.map(row=>[row.domain,row.owner]));
  const expected=targetPaths.map(p=>`${p}/foundation.boundary.json`);
  if(registry.schemaVersion!==1||registry.phase!=='P05'||registry.status!=='target-layout-prepared-not-migrated') errors.push('invalid registry state');
  if(!Array.isArray(registry.boundaries)||registry.boundaries.length!==expected.length||new Set(registry.boundaries).size!==expected.length||expected.some(p=>!registry.boundaries.includes(p))) errors.push('target coverage mismatch');
  for(const ref of registry.boundaries??[]) {
   try {
    const item=JSON.parse(fs.readFileSync(contained(ref),'utf8'));
    if(Object.keys(item).some(key=>!keys.has(key))) errors.push(`${ref}: unknown descriptor field`);
    if(ref!==`${item.path}/foundation.boundary.json`||!targetPaths.includes(item.path)) errors.push(`${ref}: identity mismatch`);
    if(item.schemaVersion!==1||item.phase!=='P05'||item.implementationStatus!=='foundation-only'||item.runtimeEntrypoint!==null||item.migrationAuthorized!==false||!Array.isArray(item.grantedPermissions)||item.grantedPermissions.length||item.runtimeOwnershipEnforcement!=='NOT RUN') errors.push(`${ref}: runtime or migration overclaim`);
    if(!['Core','Prep','Ops','Marketing','Web','Intelligence'].includes(item.owner)) errors.push(`${ref}: invalid owner`);
    const expectedOwner=item.path.startsWith('modules/')?{prep:'Prep',ops:'Ops',marketing:'Marketing',web:'Web',intelligence:'Intelligence'}[item.path.split('/')[1]]:item.path==='apps/customer-web'?'Web':item.path==='services/marketing-python'?'Marketing':'Core';
    if(item.owner!==expectedOwner) errors.push(`${ref}: boundary owner mismatch`);
    if(item.ownershipSource!=='docs/architecture/culinary-foundation.json'||!Array.isArray(item.dataDomainRefs)) errors.push(`${ref}: ownership provenance missing`);
    else for(const domain of item.dataDomainRefs) if(owners.get(domain)!==item.owner) errors.push(`${ref}: domain owner mismatch ${domain}`);
    const requiredDomains=domainSets[item.path]??[];
    if(!Array.isArray(item.dataDomainRefs)||item.dataDomainRefs.length!==requiredDomains.length||requiredDomains.some(domain=>!item.dataDomainRefs.includes(domain))) errors.push(`${ref}: required domain coverage mismatch`);
    if(typeof item.purpose!=='string'||item.purpose.trim().length<20||item.kind!==item.path.split('/')[0]||item.dependencyDirection!=='surfaces -> modules -> domain/contracts -> infrastructure') errors.push(`${ref}: architecture content missing`);
    if(!Array.isArray(item.references)||!item.references.includes(item.ownershipSource)) errors.push(`${ref}: references missing`);
    else {
     for(const source of item.references) if(!fs.statSync(contained(source)).isFile()) errors.push(`${ref}: reference is not a file`);
     if(!plannedOnly.has(item.path)&&!item.references.some(source=>source!==item.ownershipSource)) errors.push(`${ref}: existing implementation evidence missing`);
    }
   } catch(error) { errors.push(`${ref}: ${error.message}`); }
  }
 } catch(error) { errors.push(error.message); }
 return {status:errors.length?'FAIL':'PASS',targetBoundaries:targetPaths.length,scope:'layout metadata/source references only; runtime behavior NOT RUN',errors};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const result=validateLayout(path.resolve(process.argv[2]??'.'));
 console.log(JSON.stringify(result,null,2));
 process.exitCode=result.errors.length?1:0;
}
