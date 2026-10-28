import {createClient} from '@supabase/supabase-js';
import {readCloudConfig} from './config.js';
let client;
async function timedFetch(url,options={}){const controller=new AbortController();const cancel=()=>controller.abort();if(options.signal?.aborted)cancel();else options.signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,20000);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel)}}
// Prepared for the authentication screen. No automatic upload or migration.
export function getCloudClient(){
 if(client)return client;
 const config=readCloudConfig(import.meta.env);
 if(!config.configured)return null;
 client=createClient(config.url,config.key,{global:{fetch:timedFetch},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'pv-engraissement-auth'}});
 return client;
}
