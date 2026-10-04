import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url);
let parser;
try {parser=process.env.FOUNDATION_TYPESCRIPT?resolve(process.env.FOUNDATION_TYPESCRIPT):require.resolve('typescript');require(parser);}
catch {console.error('An existing TypeScript parser is required. Set FOUNDATION_TYPESCRIPT to its module path; no install is performed.');process.exit(1);}
const files=readdirSync(resolve(root,'tests/architecture')).filter(file=>file.endsWith('.test.mjs')).sort().map(file=>`tests/architecture/${file}`);
if(!files.length) throw Error('No foundation tests discovered');
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,env:{...process.env,FOUNDATION_TYPESCRIPT:parser},stdio:'inherit'});
if(result.error) {console.error(result.error.message);process.exit(1);}
process.exitCode=result.status??1;
