import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {cameraErrorMessage} from '../src/camera-error.js';

test('Generated Android project keeps camera permission after repeated configuration, without microphone permission',()=>{
 const dir=mkdtempSync(join(tmpdir(),'prevert-camera-'));
 try{
  const path=join(dir,'AndroidManifest.xml');
  writeFileSync(path,'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:label="Test"/><uses-permission android:name="android.permission.INTERNET"/></manifest>');
  execFileSync('python3',['scripts/configure-android.py',path]);
  const first=readFileSync(path,'utf8');
  execFileSync('python3',['scripts/configure-android.py',path]);
  assert.equal(readFileSync(path,'utf8'),first);
  assert.equal((first.match(/android.permission.CAMERA/g)||[]).length,1);
  assert.match(first,/android.permission.INTERNET/);
  assert.match(first,/android:label="Test"/);
  assert.match(first,/android.hardware.camera" android:required="false"/);
  assert.doesNotMatch(first,/RECORD_AUDIO/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('Camera errors distinguish Android permissions, site permissions and hardware availability',()=>{
 assert.match(cameraErrorMessage({name:'NotAllowedError'},true),/paramètres Android/);
 assert.match(cameraErrorMessage({name:'NotAllowedError'}),/permissions de ce site/);
 assert.match(cameraErrorMessage({name:'NotReadableError'}),/autres applications/);
 assert.match(cameraErrorMessage({name:'NotFoundError'}),/Aucune caméra/);
});
