"""Refuse to publish an incomplete APK or a mismatched update manifest."""
import hashlib,json,zipfile
from pathlib import Path
from urllib.parse import urlparse
folder=Path('distribution/android')
manifest=folder/'latest.json'
if manifest.exists():
    info=json.loads(manifest.read_text())
    apk=folder/Path(urlparse(info['downloadUrl']).path).name
    if hashlib.sha256(apk.read_bytes()).hexdigest()!=info['sha256']:
        raise SystemExit('APK checksum does not match latest.json; publication blocked.')
    with zipfile.ZipFile(apk) as z:
        if z.testzip() is not None:raise SystemExit('APK ZIP integrity failed; publication blocked.')
    print('Verified Android distribution:',info['versionName'])
