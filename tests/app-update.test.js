import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {availableUpdate} from '../src/app-update.js';
import {cameraErrorMessage} from '../src/camera-error.js';
const config=JSON.parse(readFileSync(new URL('../app-release.json',import.meta.url)));
const current={id:config.applicationId,build:String(config.versionCode)};
const release={applicationId:config.applicationId,versionName:'1.0.1',versionCode:config.versionCode+1,sha256:'a'.repeat(64),signingCertificateSha256:config.signingCertificateSha256,downloadUrl:new URL('pre-vert-engraissement-1.0.1.apk',config.updatesUrl).href};
test('Updates require a newer build and preserve the permanent Android identity',()=>{
 assert.equal(availableUpdate(release,current,config).versionCode,config.versionCode+1);
 assert.equal(availableUpdate({...release,versionCode:config.versionCode},current,config),null);
 assert.equal(availableUpdate({...release,versionCode:1},current,config),null);
 assert.equal(availableUpdate(release,{...current,id:current.id+'.debug'},config),null);
});
test('Untrusted update links and mismatched signing identities are rejected',()=>{
 for(const patch of [{downloadUrl:'https://evil.example/a.apk'},{downloadUrl:'http://adrienlabrunie-coder.github.io/pre-vert-engraissement/android/a.apk'},{downloadUrl:new URL('../a.apk',config.updatesUrl).href},{signingCertificateSha256:'b'.repeat(64)},{sha256:''},{applicationId:'another.app'},{versionCode:'1000001'}])assert.throws(()=>availableUpdate({...release,...patch},current,config));
});
test('iOS camera instructions do not send users to Android settings',()=>{
 assert.match(cameraErrorMessage({name:'NotAllowedError'},'ios'),/Réglages/);
 assert.doesNotMatch(cameraErrorMessage({name:'NotAllowedError'},'ios'),/Android/);
});
