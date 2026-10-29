"""Apply permanent native identity, versions, privacy descriptions and app icons."""
from pathlib import Path
import json,sys,plistlib
from PIL import Image

platform=sys.argv[1]
release=json.loads(Path('app-release.json').read_text())
assert isinstance(release['versionCode'],int) and 0<release['versionCode']<2100000000
icon=Image.open('public/icon-512.png').convert('RGBA')
def save_icon(path,size,padding=0,transparent=False):
    canvas=Image.new('RGBA',(size,size),(0,0,0,0) if transparent else (255,255,255,255))
    inner=round(size*(1-padding*2));im=icon.copy();im.thumbnail((inner,inner),Image.Resampling.LANCZOS)
    canvas.alpha_composite(im,((size-im.width)//2,(size-im.height)//2))
    path.parent.mkdir(parents=True,exist_ok=True)
    (canvas if transparent else canvas.convert('RGB')).save(path)
if platform=='android':
    gradle=Path('android/app/build.gradle');text=gradle.read_text()
    line="apply from: '../../scripts/android-release.gradle'"
    if line not in text:gradle.write_text(text+'\n'+line+'\n')
    for density,size,fg in [('mdpi',48,108),('hdpi',72,162),('xhdpi',96,216),('xxhdpi',144,324),('xxxhdpi',192,432)]:
        folder=Path('android/app/src/main/res')/('mipmap-'+density)
        save_icon(folder/'ic_launcher.png',size)
        save_icon(folder/'ic_launcher_round.png',size)
        save_icon(folder/'ic_launcher_foreground.png',fg,.20,True)
    # Prevent inherited Capacitor adaptive backgrounds from retaining its default colour.
    colors=Path('android/app/src/main/res/values/ic_launcher_background.xml')
    if colors.exists():colors.write_text('<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#FFFFFF</color></resources>')
elif platform=='ios':
    path=Path('ios/App/App/Info.plist')
    with path.open('rb') as f:info=plistlib.load(f)
    info['CFBundleShortVersionString']=release['versionName'];info['CFBundleVersion']=release['versionName']
    info['NSCameraUsageDescription']='Scanner les codes-barres des passeports bovins.'
    info['NSPhotoLibraryUsageDescription']='Choisir des photos de passeports pour identifier les bovins.'
    with path.open('wb') as f:plistlib.dump(info,f)
    folder=Path('ios/App/App/Assets.xcassets/AppIcon.appiconset')
    save_icon(folder/'AppIcon-512@2x.png',1024)
    (folder/'Contents.json').write_text(json.dumps({'images':[{'filename':'AppIcon-512@2x.png','idiom':'universal','platform':'ios','size':'1024x1024'}],'info':{'author':'xcode','version':1}},indent=2))
else:raise SystemExit('Expected android or ios')
print(f'{platform}: {release["applicationId"]} {release["versionName"]} ({release["versionCode"]})')
