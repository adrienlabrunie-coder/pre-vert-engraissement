"""Apply app permissions after `cap add android` (also safe to run again)."""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

path = Path(sys.argv[1] if len(sys.argv) > 1 else 'android/app/src/main/AndroidManifest.xml')
android = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', android)
tree = ET.parse(path)
root = tree.getroot()
name = '{' + android + '}name'
if not any(e.get(name) == 'android.permission.CAMERA' for e in root.findall('uses-permission')):
    ET.SubElement(root, 'uses-permission', {name: 'android.permission.CAMERA'})
# Keep installation possible on devices without a camera; manual entry remains available.
for feature in ['android.hardware.camera', 'android.hardware.camera.autofocus']:
    node = next((e for e in root.findall('uses-feature') if e.get(name) == feature), None)
    if node is None:
        node = ET.SubElement(root, 'uses-feature', {name: feature})
    node.set('{' + android + '}required', 'false')
ET.indent(tree, space='    ')
tree.write(path, encoding='utf-8', xml_declaration=True)
print('Android camera permission configured.')
