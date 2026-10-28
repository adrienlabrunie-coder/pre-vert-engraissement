export const PROJECT_URL='https://lzufwduwpngrshkzayaz.supabase.co';
export function readCloudConfig(env={}){
 const url=String(env.VITE_SUPABASE_URL||PROJECT_URL).trim();
 const key=String(env.VITE_SUPABASE_PUBLISHABLE_KEY??'sb_publishable_DB3mer2aNO1oIF04TvpfzA_nrJT79x2').trim();
 if(!key)return {configured:false,url};
 // The web bundle is public: reject server credentials before creating a client.
 if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))throw new Error('Utilisez uniquement la clé publique sb_publishable_ du projet Supabase.');
 if(url!==PROJECT_URL)throw new Error('Cette configuration ne correspond pas au projet Pré Vert Engraissement.');
 return {configured:true,url,key};
}
