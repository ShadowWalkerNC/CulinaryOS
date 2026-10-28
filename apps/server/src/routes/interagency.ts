import{Hono}from'hono';
import{bodyLimit}from'hono/body-limit';
import type{Env}from'../types.js';
import{requireTenant}from'../middleware/auth.js';
import{adminSupabase}from'../middleware/supabase.js';
import{InteragencyError,InteragencyService,type Actor}from'../interagency/service.js';
import{SupabaseInteragencyStore}from'../interagency/supabase-store.js';
import{isNativePostgresEnabled}from'../postgres/config.js';

function bearer(header:string|undefined){return header?.startsWith('Bearer ')?header.slice(7):'';}
export function createInteragencyRoutes(resolve:()=>InteragencyService|null=()=>{if(isNativePostgresEnabled())return null;const db=adminSupabase();return db?new InteragencyService(new SupabaseInteragencyStore(db)):null;},enabled:()=>boolean=()=>process.env.INTERAGENCY_READ_ENABLED==='true'){
 const routes=new Hono<Env>();
 routes.onError((e,c)=>{if(e instanceof InteragencyError)return c.json({error:e.message},e.status);return c.json({error:'Interagency data unavailable; no fallback source is used'},503);});
 routes.use('*',bodyLimit({maxSize:65536,onError:c=>c.json({error:'Interagency request exceeds64KB'},413)}));
 routes.use('*',async(c,next)=>{c.header('Cache-Control','no-store');if(!enabled())return c.json({error:'Interagency connection is disabled'},404);await next();});
 const service=()=>{const value=resolve();if(!value)throw new InteragencyError(503,'Authenticated data backend unavailable');return value;};
 const actor=(c:{get:(key:'userId'|'tenantId'|'authRole'|'authMode')=>unknown}):Actor=>({userId:String(c.get('userId')??''),tenantId:String(c.get('tenantId')??''),role:String(c.get('authRole')??''),mode:String(c.get('authMode')??'')});
 routes.post('/authorize',requireTenant,async c=>{const p=await c.req.json().catch(()=>null);if(!p||typeof p.redirectUri!=='string'||typeof p.challenge!=='string'||typeof p.state!=='string'||!Array.isArray(p.scopes)||!p.scopes.every((s:unknown)=>typeof s==='string'))return c.json({error:'Invalid authorization request'},422);return c.json(await service().authorize(actor(c),p));});
 routes.post('/token',async c=>{const p=await c.req.json().catch(()=>null);if(!p)return c.json({error:'Invalid token request'},422);if(p.grantType==='authorization_code'&&typeof p.code==='string'&&typeof p.verifier==='string'&&typeof p.redirectUri==='string')return c.json(await service().exchange(p));if(p.grantType==='refresh_token'&&typeof p.refreshToken==='string')return c.json(await service().refresh(p.refreshToken));return c.json({error:'Unsupported or malformed grant exchange'},422);});
 routes.post('/revoke',async c=>{const p=await c.req.json().catch(()=>null);if(!p||typeof p.refreshToken!=='string'||p.refreshToken.length>128)return c.json({error:'Invalid revocation request'},422);return c.json(await service().disconnect(p.refreshToken));});
 routes.get('/snapshots',async c=>c.json(await service().snapshot(bearer(c.req.header('Authorization')),{resource:c.req.query('resource')??'',...(c.req.query('cursor')?{cursor:c.req.query('cursor')!}:{}),...(c.req.query('limit')?{limit:Number(c.req.query('limit'))}:{}),...(c.req.header('X-Tenant-Id')?{tenantHint:c.req.header('X-Tenant-Id')!}:{})})));
 routes.get('/grants',requireTenant,async c=>c.json({grants:await service().list(actor(c))}));
 routes.post('/grants/:id/revoke',requireTenant,async c=>c.json(await service().revoke(actor(c),c.req.param('id')!)));
 return routes;
}
export const interagencyRoutes=createInteragencyRoutes();
