"""Assemble the release when stored in parts and verify it before publication."""
import hashlib
import json
import shutil
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlparse


def verify_apk(path, expected_hash):
    with path.open('rb') as stream:
        checksum = hashlib.file_digest(stream, 'sha256').hexdigest()
    if checksum != expected_hash:
        raise SystemExit('APK checksum does not match latest.json; publication blocked.')
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None:
            raise SystemExit('APK ZIP integrity failed; publication blocked.')


folder = Path('distribution/android')
manifest = folder / 'latest.json'
if manifest.exists():
    info = json.loads(manifest.read_text())
    apk = folder / Path(urlparse(info['downloadUrl']).path).name
    if apk.exists():
        verify_apk(apk, info['sha256'])
    else:
        parts = sorted((folder.with_name('android-parts') / apk.name).glob('*.part'))
        if not parts:
            raise SystemExit(f'Missing Android release {apk.name}; publication blocked.')
        with tempfile.NamedTemporaryFile(dir=folder, delete=False) as opened:
            temporary_apk = Path(opened.name)
        try:
            with temporary_apk.open('wb') as output:
                for part in parts:
                    with part.open('rb') as source:
                        shutil.copyfileobj(source, output)
            verify_apk(temporary_apk, info['sha256'])
            temporary_apk.chmod(0o644)
            temporary_apk.replace(apk)
        finally:
            temporary_apk.unlink(missing_ok=True)
    print('Verified Android distribution:', info['versionName'])
