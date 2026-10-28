import type {SupabaseClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {InteragencyError,type Authorization,type Grant,type GrantStore,type Resource,type SnapshotRecord} from './service.js';

type Row=Record<string,unknown>;
function grant(r:Row):Grant{return{id:String(r.id),tenantId:String(r.tenant_id),userId:String(r.user_id),audience:r.audience as Grant['audience'],scopes:r.scopes as Resource[],expiresAt:String(r.expires_at),revokedAt:r.revoked_at?String(r.revoked_at):null,tokenHash:r.token_hash?String(r.token_hash):null,tokenExpiresAt:r.token_expires_at?String(r.token_expires_at):null,refreshHash:r.refresh_hash?String(r.refresh_hash):null};}
function check(error:unknown){if(error)throw new InteragencyError(503,'Interagency data unavailable; no demo or shared-memory fallback');}
export class SupabaseInteragencyStore implements GrantStore{
 constructor(private readonly db:SupabaseClient){}
 async create(g:Grant,a:Authorization){const{error}=await this.db.rpc('interagency_create_authorization',{p_grant:{id:g.id,tenant_id:g.tenantId,user_id:g.userId,audience:g.audience,scopes:g.scopes,expires_at:g.expiresAt},p_authorization:{code_hash:a.codeHash,challenge:a.challenge,redirect_uri:a.redirectUri,expires_at:a.expiresAt}});check(error);}
 async authorization(hash:string){const{data,error}=await this.db.from('interagency_authorizations').select('code_hash,grant_id,challenge,redirect_uri,expires_at,used_at').eq('code_hash',hash).maybeSingle();check(error);return data&&!data.used_at?{codeHash:data.code_hash,grantId:data.grant_id,challenge:data.challenge,redirectUri:data.redirect_uri,expiresAt:data.expires_at}:null;}
 async exchange(codeHash:string,challenge:string,redirectUri:string,tokenHash:string,refreshHash:string,tokenExpiresAt:string,now:string){const{data,error}=await this.db.rpc('interagency_exchange_code',{p_code_hash:codeHash,p_challenge:challenge,p_redirect_uri:redirectUri,p_token_hash:tokenHash,p_refresh_hash:refreshHash,p_token_expires_at:tokenExpiresAt,p_now:now});check(error);return data?.[0]?grant(data[0]):null;}
 private async lookup(field:'token_hash'|'refresh_hash',hash:string){const{data,error}=await this.db.from('interagency_grants').select('*').eq(field,hash).maybeSingle();check(error);return data?grant(data):null;}
 byAccess(hash:string){return this.lookup('token_hash',hash);}
 byRefresh(hash:string){return this.lookup('refresh_hash',hash);}
 async rotate(id:string,oldRefreshHash:string,tokenHash:string,refreshHash:string,tokenExpiresAt:string,now:string){const{data,error}=await this.db.rpc('interagency_rotate_refresh',{p_id:id,p_old_refresh_hash:oldRefreshHash,p_token_hash:tokenHash,p_refresh_hash:refreshHash,p_token_expires_at:tokenExpiresAt,p_now:now});check(error);return data?.[0]?grant(data[0]):null;}
 async member(userId:string,tenantId:string){const{data,error}=await this.db.from('tenant_users').select('role').eq('user_id',userId).eq('tenant_id',tenantId).maybeSingle();check(error);return Boolean(data&&['owner','manager'].includes(data.role));}
 async revoke(id:string,tenantId:string){const{error}=await this.db.from('interagency_grants').update({revoked_at:new Date().toISOString(),token_hash:null,refresh_hash:null}).eq('id',id).eq('tenant_id',tenantId);check(error);}
 async list(userId:string,tenantId:string){const{data,error}=await this.db.from('interagency_grants').select('*').eq('user_id',userId).eq('tenant_id',tenantId);check(error);return(data??[]).map(grant);}
 async snapshot(tenantId:string,resource:Resource,offset:number,limit:number):Promise<SnapshotRecord[]>{
  // Raw explicit fields only. Missing composition/currency/yield requires review in the recipient.
  const projections={recipes:{table:'recipes',columns:'id,name,base_ingredient,yield_unit,base_yield_portions,station,tags,updated_at'},menus:{table:'menu_items',columns:'id,name,description,price,status,section_id,updated_at'},inventory:{table:'ingredients',columns:'id,name,unit,current_qty,reorder_at,cost_per_unit,updated_at'}};
  if(resource==='recipes'){
   const{data,error}=await this.db.rpc('interagency_recipe_snapshot',{p_tenant_id:tenantId,p_offset:offset,p_limit:limit});check(error);return(data??[]).map((r:Row)=>this.record(String(r.id),r));
  }
  if(resource==='sales_summary'){
   const{data,error}=await this.db.rpc('interagency_sales_summary',{p_tenant_id:tenantId,p_offset:offset,p_limit:limit});check(error);
   return(data??[]).map((r:Row)=>this.record(String(r.id),r));
  }
  if(resource==='purchases'){
   const{data,error}=await this.db.from('restock_purchase_orders').select('id,status,supplier,received_at,updated_at,po_line_items(id,ingredient_id,ingredient_name,unit,ordered_qty,received_qty,unit_cost)').eq('tenant_id',tenantId).eq('status','received').order('id').range(offset,offset+limit-1);check(error);return(data??[]).map((r:Row)=>this.record(String(r.id),r));
  }
  const projection=projections[resource];
  const{data,error}=await this.db.from(projection.table).select(projection.columns).eq('tenant_id',tenantId).order('id').range(offset,offset+limit-1);check(error);
  return(data??[]).map(r=>this.record(String((r as unknown as Row).id),r as unknown as Row));
 }
 private record(id:string,data:Row):SnapshotRecord{return{id,sourceVersion:createHash('sha256').update(JSON.stringify(data)).digest('hex'),data};}
}
