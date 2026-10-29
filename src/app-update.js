export function availableUpdate(manifest,current,config){
 if(current.id!==config.applicationId)return null;
 if(!manifest||manifest.applicationId!==config.applicationId||!Number.isSafeInteger(manifest.versionCode)||manifest.versionCode<=0)throw Error('Informations de mise à jour invalides.');
 if(!/^\d+\.\d+\.\d+$/.test(manifest.versionName||'')||!/^[a-f0-9]{64}$/.test(manifest.sha256||'')||manifest.signingCertificateSha256!==config.signingCertificateSha256)throw Error('La signature de cette version ne correspond pas à l’application.');
 const url=new URL(manifest.downloadUrl),base=new URL(config.updatesUrl);
 if(url.protocol!=='https:'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname.slice(0,base.pathname.lastIndexOf('/')+1))||!url.pathname.endsWith('.apk')||url.username||url.password||url.search||url.hash)throw Error('Lien de mise à jour non autorisé.');
 const code=Number(current.build);
 if(!Number.isSafeInteger(code)||code<=0)throw Error('Version installée inconnue.');
 return manifest.versionCode>code?{...manifest,downloadUrl:url.href}:null;
}
