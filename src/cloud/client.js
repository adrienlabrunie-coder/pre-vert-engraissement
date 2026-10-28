import {createClient} from '@supabase/supabase-js';
import {readCloudConfig} from './config.js';
let client;
// Prepared for the authentication screen. No automatic upload or migration.
export function getCloudClient(){
 if(client)return client;
 const config=readCloudConfig(import.meta.env);
 if(!config.configured)return null;
 client=createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'pv-engraissement-auth'}});
 return client;
}
