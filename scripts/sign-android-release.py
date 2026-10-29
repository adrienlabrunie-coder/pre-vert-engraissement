"""Sign a validated unsigned build using the private backup, never a generated debug key.
Usage: python3 scripts/sign-android-release.py BUILD_DIR PRIVATE_KEY_DIR
The private directory must be outside this Git repository. Never commit it.
"""
import json,re,sys,subprocess,hashlib
from pathlib import Path
from datetime import datetime,timezone
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'app-release.json').read_text())
build=Path(sys.argv[1]).resolve();private=Path(sys.argv[2]).resolve()
if private.is_relative_to(root):raise SystemExit('The signing backup must remain outside the repository.')
for file in ['app-release-unsigned.apk','apk-badging.txt','apksigner.jar']:
    if not (build/file).is_file():raise SystemExit('Missing build input: '+file)
badging=(build/'apk-badging.txt').read_text()
for expected in ["name='"+config['applicationId']+"'","versionCode='"+str(config['versionCode'])+"'","versionName='"+config['versionName']+"'"]:
    if expected not in badging:raise SystemExit('Build identity/version mismatch: '+expected)
if 'application-debuggable' in badging:raise SystemExit('Refusing a debuggable build.')
out=root/'distribution/android';out.mkdir(parents=True,exist_ok=True)
filename='pre-vert-engraissement-'+config['versionName']+'.apk';apk=out/filename
subprocess.run(['java','-jar',str(build/'apksigner.jar'),'sign','--ks',str(private/'prevert-android-release.p12'),'--ks-key-alias','prevert-release','--ks-pass','file:'+str(private/'signing-password.txt'),'--key-pass','file:'+str(private/'signing-password.txt'),'--out',str(apk),str(build/'app-release-unsigned.apk')],check=True)
verification=subprocess.check_output(['java','-jar',str(build/'apksigner.jar'),'verify','--verbose','--print-certs',str(apk)],text=True)
match=re.search(r'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]+)',verification)
if not match or match[1].lower()!=config['signingCertificateSha256']:
    apk.unlink(missing_ok=True);raise SystemExit('Unexpected signing identity; output removed.')
manifest={**config,'downloadUrl':config['updatesUrl'].rsplit('/',1)[0]+'/'+filename,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'publishedAt':datetime.now(timezone.utc).isoformat()}
manifest.pop('updatesUrl')
(out/'latest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(verification)
print('Signed release ready:',apk)
