import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
Deno.serve(async(req: Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const token=req.headers.get('x-backup-token');
 if(!token||!/^[a-f0-9]{64}$/.test(token))return new Response('Unauthorized',{status:401});
 const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
 const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)return new Response('Backup configuration unavailable',{status:503});
 const client=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const rpc=async(action:string,id:string|null=null,error:string|null=null)=>{
  const r=await client.rpc('pv_backup_worker',{p_token:token,p_action:action,p_id:id,p_error:error});if(r.error)throw r.error;return r.data;
 };
 let backups;
 try{backups=await rpc('capture')}catch(e){return new Response(e.code==='42501'?'Unauthorized':'Backup unavailable',{status:e.code==='42501'?401:503})}
 let archived=0,failed=0;
 for(const b of backups){
  try{
   const path=`${b.farm_id}/${b.id}.json`,body=JSON.stringify(await rpc('document',b.id));
   const {error}=await client.storage.from('pv-backups').upload(path,body,{contentType:'application/json',upsert:false});
   // Download verification also handles a retry after a successful upload but lost acknowledgement.
   const saved=await client.storage.from('pv-backups').download(path);
   if(saved.error||await saved.data.text()!==body)throw error||saved.error||new Error('Archive verification failed');
   await rpc('archived',b.id);archived++;
  }catch(e){failed++;await rpc('error',b.id,String(e.message||'Archive failed')).catch(()=>{});}
 }
 return Response.json({archived,failed},{status:failed?503:200});
});
