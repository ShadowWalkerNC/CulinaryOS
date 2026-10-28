import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';

export const RESOURCES=['recipes','menus','purchases','inventory','sales_summary'] as const;
export type Resource=typeof RESOURCES[number];
export interface Actor{userId:string;tenantId:string;role:string;mode:string}
export interface Grant{id:string;tenantId:string;userId:string;audience:'culinaryos-interagency';scopes:Resource[];expiresAt:string;revokedAt:string|null;tokenHash:string|null;tokenExpiresAt:string|null;refreshHash:string|null}
export interface Authorization{codeHash:string;grantId:string;challenge:string;redirectUri:string;expiresAt:string}
export interface SnapshotRecord{id:string;sourceVersion:string;data:Record<string,unknown>}
export interface GrantStore{
 create(grant:Grant,authorization:Authorization):Promise<void>;
 authorization(codeHash:string):Promise<Authorization|null>;
 exchange(codeHash:string,challenge:string,redirectUri:string,tokenHash:string,refreshHash:string,tokenExpiresAt:string,now:string):Promise<Grant|null>;
 byAccess(hash:string):Promise<Grant|null>;
 byRefresh(hash:string):Promise<Grant|null>;
 rotate(id:string,oldRefreshHash:string,tokenHash:string,refreshHash:string,tokenExpiresAt:string,now:string):Promise<Grant|null>;
 member(userId:string,tenantId:string):Promise<boolean>;
 revoke(id:string,tenantId:string):Promise<void>;
 list(userId:string,tenantId:string):Promise<Grant[]>;
 snapshot(tenantId:string,resource:Resource,offset:number,limit:number):Promise<SnapshotRecord[]>;
}
export class InteragencyError extends Error{constructor(public readonly status:401|403|404|409|422|503,message:string){super(message);}}
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const opaque=()=>randomBytes(32).toString('base64url');
const iso=(ms:number)=>new Date(ms).toISOString();
const validId=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export function callbackAllowed(raw:string):boolean{try{const u=new URL(raw);return u.protocol==='http:'&&u.hostname==='127.0.0.1'&&Number(u.port)>=1024&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/interagency/callback';}catch{return false;}}
export function requireActor(actor:Actor):void{if(actor.mode!=='jwt'||!actor.userId||!validId(actor.tenantId)||!['owner','manager'].includes(actor.role))throw new InteragencyError(403,'A signed-in restaurant owner or manager must authorize this connection');}
export class InteragencyService{
 constructor(private readonly store:GrantStore,private readonly clock:()=>number=Date.now){}
 async authorize(actor:Actor,input:{redirectUri:string;challenge:string;state:string;scopes:string[]}){
  requireActor(actor);
  if(!callbackAllowed(input.redirectUri)||!/^[A-Za-z0-9_-]{43}$/.test(input.challenge)||!/^[A-Za-z0-9_-]{32,128}$/.test(input.state)||!input.scopes.length||input.scopes.length>RESOURCES.length||new Set(input.scopes).size!==input.scopes.length||input.scopes.some(s=>!RESOURCES.includes(s as Resource)))throw new InteragencyError(422,'Invalid loopback callback, PKCE challenge, state or resource scopes');
  if(!await this.store.member(actor.userId,actor.tenantId))throw new InteragencyError(403,'Restaurant membership unavailable or no longer authorized');
  const now=this.clock(),code=opaque(),grant:Grant={id:randomUUID(),tenantId:actor.tenantId,userId:actor.userId,audience:'culinaryos-interagency',scopes:input.scopes as Resource[],expiresAt:iso(now+30*86400000),revokedAt:null,tokenHash:null,tokenExpiresAt:null,refreshHash:null};
  await this.store.create(grant,{codeHash:digest(code),grantId:grant.id,challenge:input.challenge,redirectUri:input.redirectUri,expiresAt:iso(now+300000)});
  const callback=new URL(input.redirectUri);callback.searchParams.set('code',code);callback.searchParams.set('state',input.state);
  return{grantId:grant.id,redirect:callback.toString(),expiresIn:300};
 }
 private async valid(grant:Grant|null):Promise<Grant>{if(!grant||grant.audience!=='culinaryos-interagency'||grant.revokedAt||Date.parse(grant.expiresAt)<=this.clock())throw new InteragencyError(401,'Connection expired, revoked or invalid');if(!await this.store.member(grant.userId,grant.tenantId))throw new InteragencyError(403,'Restaurant membership unavailable or no longer authorized');return grant;}
 async exchange(input:{code:string;verifier:string;redirectUri:string}){
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(input.verifier)||!callbackAllowed(input.redirectUri)||!/^[A-Za-z0-9_-]{43}$/.test(input.code))throw new InteragencyError(422,'Invalid authorization exchange');
  const authorization=await this.store.authorization(digest(input.code)),challenge=createHash('sha256').update(input.verifier).digest('base64url');
  if(!authorization||Date.parse(authorization.expiresAt)<=this.clock()||authorization.redirectUri!==input.redirectUri||authorization.challenge.length!==challenge.length||!timingSafeEqual(Buffer.from(authorization.challenge),Buffer.from(challenge)))throw new InteragencyError(401,'Authorization code invalid, expired or already used');
  const access=opaque(),refresh=opaque(),expiry=iso(this.clock()+900000);
  const grant=await this.valid(await this.store.exchange(digest(input.code),challenge,input.redirectUri,digest(access),digest(refresh),expiry,iso(this.clock())));
  return{accessToken:access,refreshToken:refresh,expiresIn:900,grantId:grant.id,tenantId:grant.tenantId,scopes:grant.scopes,audience:grant.audience};
 }
 async refresh(refreshToken:string){
  if(!/^[A-Za-z0-9_-]{43}$/.test(refreshToken))throw new InteragencyError(401,'Invalid connection credential');
  const grant=await this.valid(await this.store.byRefresh(digest(refreshToken))),access=opaque(),refresh=opaque(),expiry=iso(this.clock()+900000);
  await this.valid(await this.store.rotate(grant.id,digest(refreshToken),digest(access),digest(refresh),expiry,iso(this.clock())));
  return{accessToken:access,refreshToken:refresh,expiresIn:900,grantId:grant.id,tenantId:grant.tenantId,scopes:grant.scopes,audience:grant.audience};
 }
 async snapshot(token:string,input:{resource:string;cursor?:string;limit?:number;tenantHint?:string}){
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new InteragencyError(401,'Invalid connection credential');
  const grant=await this.valid(await this.store.byAccess(digest(token)));
  if(!grant.tokenExpiresAt||Date.parse(grant.tokenExpiresAt)<=this.clock())throw new InteragencyError(401,'Access expired; refresh the connection');
  if(input.tenantHint&&input.tenantHint!==grant.tenantId)throw new InteragencyError(403,'Connection is not authorized for that restaurant');
  if(!RESOURCES.includes(input.resource as Resource)||!grant.scopes.includes(input.resource as Resource))throw new InteragencyError(403,'Resource scope not authorized');
  const limit=input.limit??100;if(!Number.isInteger(limit)||limit<1||limit>200)throw new InteragencyError(422,'Page limit must be1–200');
  let offset=0;
  if(input.cursor){try{const c=JSON.parse(Buffer.from(input.cursor,'base64url').toString('utf8')) as {grant:string;resource:string;offset:number};if(c.grant!==grant.id||c.resource!==input.resource||!Number.isSafeInteger(c.offset)||c.offset<0||c.offset>1000000)throw Error();offset=c.offset;}catch{throw new InteragencyError(422,'Invalid resource cursor');}}
  const rows=await this.store.snapshot(grant.tenantId,input.resource as Resource,offset,limit+1),more=rows.length>limit;
  return{tenantId:grant.tenantId,resource:input.resource,capturedAt:iso(this.clock()),dataVersion:'v1',records:rows.slice(0,limit),nextCursor:more?Buffer.from(JSON.stringify({grant:grant.id,resource:input.resource,offset:offset+limit})).toString('base64url'):null,readOnly:true};
 }
 async disconnect(refreshToken:string){const grant=await this.store.byRefresh(digest(refreshToken));if(grant)await this.store.revoke(grant.id,grant.tenantId);return{revoked:true};}
 async list(actor:Actor){requireActor(actor);if(!await this.store.member(actor.userId,actor.tenantId))throw new InteragencyError(403,'Membership not authorized');return(await this.store.list(actor.userId,actor.tenantId)).map(({tokenHash,refreshHash,...metadata})=>metadata);}
 async revoke(actor:Actor,id:string){requireActor(actor);if(!validId(id)||!await this.store.member(actor.userId,actor.tenantId))throw new InteragencyError(403,'Membership not authorized');await this.store.revoke(id,actor.tenantId);return{revoked:true};}
}
