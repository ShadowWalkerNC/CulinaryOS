import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateLayout,targetPaths} from '../../scripts/validate-foundation-layout.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('real target boundaries have contained source evidence and no runtime activation',()=>assert.deepEqual(validateLayout(root).errors,[]));
function fixture(t) {
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'culinary-layout-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const files=new Set(['docs/architecture/foundation-layout.json','docs/architecture/culinary-foundation.json']);
 for(const folder of targetPaths) {
  const descriptor=`${folder}/foundation.boundary.json`;files.add(descriptor);
  for(const ref of JSON.parse(fs.readFileSync(path.join(root,descriptor),'utf8')).references) files.add(ref);
 }
 for(const file of files) {fs.mkdirSync(path.dirname(path.join(temp,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(temp,file));}
 return temp;
}
function edit(root,file,fn){const full=path.join(root,file);const value=JSON.parse(fs.readFileSync(full,'utf8'));fn(value);fs.writeFileSync(full,JSON.stringify(value));}
test('missing target and escaped reference fail independently',t=>{
 const temp=fixture(t);edit(temp,'docs/architecture/foundation-layout.json',v=>v.boundaries.pop());
 assert.match(validateLayout(temp).errors.join('\n'),/coverage/);
 edit(temp,'modules/prep/foundation.boundary.json',v=>v.references.push('../outside.json'));
 assert.match(validateLayout(temp).errors.join('\n'),/unsafe/);
});
test('ownership theft and permission/runtime claims fail',t=>{
 const temp=fixture(t);edit(temp,'modules/prep/foundation.boundary.json',v=>{v.dataDomainRefs.push('payments');v.runtimeEntrypoint='start.ts';v.grantedPermissions=['deploy'];});
 const errors=validateLayout(temp).errors.join('\n');assert.match(errors,/domain owner mismatch/);assert.match(errors,/overclaim/);
});
test('missing implementation evidence cannot pass',t=>{
 const temp=fixture(t);fs.unlinkSync(path.join(temp,'apps/server/src/routes/orders.ts'));
 assert.equal(validateLayout(temp).status,'FAIL');
});
test('erased domains or implementation evidence, directory references and extra runtime keys fail',t=>{
 const temp=fixture(t);
 edit(temp,'modules/prep/foundation.boundary.json',v=>{v.dataDomainRefs=[];v.references=[v.ownershipSource];v.scripts={start:'run'};});
 edit(temp,'apps/pos/foundation.boundary.json',v=>v.references.push('docs'));
 const errors=validateLayout(temp).errors.join('\n');
 assert.match(errors,/required domain coverage/);assert.match(errors,/implementation evidence missing/);
 assert.match(errors,/reference is not a file/);assert.match(errors,/unknown descriptor field/);
});
