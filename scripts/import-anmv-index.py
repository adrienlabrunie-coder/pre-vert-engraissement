"""Build a dated, offline reference snapshot from the public ANMV index.
No treatment advice is inferred from free text. Numeric prefill requires a reviewed mapping.
Usage: python scripts/import-anmv-index.py
"""
import concurrent.futures, urllib.request, urllib.parse, re, html, json, hashlib, datetime, time
from pathlib import Path
BASE='https://www.ircp.anmv.anses.fr/'
CACHE=Path('/tmp/prevert-anmv-cache');CACHE.mkdir(exist_ok=True)
def get(url):
 p=CACHE/hashlib.sha256(url.encode()).hexdigest()
 if p.exists():return p.read_text()
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'PreVert-reference-import/1.0'})
   s=urllib.request.urlopen(req,timeout=30).read().decode('utf-8-sig')
   if 'Maintenance en cours' in s:raise ValueError('maintenance')
   p.write_text(s);return s
  except Exception:
   if attempt==2:raise
   time.sleep(1)
def text(s):
 s=re.sub(r'<(?:br\s*/?|/p|/div|/tr)>','\n',s,flags=re.I)
 return '\n'.join(x.strip() for x in html.unescape(re.sub('<[^>]*>',' ',s)).splitlines() if x.strip())
def index(letter):
 s=get(BASE+'index.aspx?letter='+letter);rows=[]
 for tr in re.findall(r'<tr[^>]*>(.*?)</tr>',s,re.S|re.I):
  cells=re.findall(r'<td[^>]*>(.*?)</td>',tr,re.S|re.I)
  if len(cells)<10 or not re.search('bovin|veau|vache',text(cells[9]),re.I):continue
  name=text(cells[2]);link=re.search(r'href=[\"\']([^\"\']*rcp.aspx[^\"\']*)',tr)
  if not name or not link:continue
  url=urllib.parse.urljoin(BASE,html.unescape(link[1]));amm=text(cells[4]);rows.append({'id':hashlib.sha256(url.encode()).hexdigest()[:16],'name':name,'holder':text(cells[3]),'amm':amm,'species':text(cells[9]),'form':text(cells[7]),'rcpUrl':url})
 return rows
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: products=[p for group in pool.map(index,'ABCDEFGHIJKLMNOPQRSTUVWXYZ0') for p in group]
products=list({p['id']:p for p in products}.values());print('Catalogue bovin :',len(products),flush=True)
def enrich(p):
 try:
  s=get(p['rcpUrl']);sections={}
  parts=re.split(r'<span[^>]*class=[\"\']titre2[\"\'][^>]*>',s,flags=re.I)
  for part in parts[1:]:
   heading,sep,body=part.partition('</span>');heading=text(heading)
   if re.match(r'^(3\.9|4\.9)\s',heading):sections['posology']=text(body)
   elif re.match(r'^(3\.12|4\.11)\s',heading):sections['withdrawal']=text(body)
   elif re.match(r'^(3\.[34578]|4\.[34578])\s',heading):sections.setdefault('precautions',[]).append(heading+'\n'+text(body))
  # Keep content as text only; tables retain their line order. Always link complete RCP.
  p.update(sections)
  p['precautions']='\n\n'.join(p.get('precautions',[]))
  p['sourceHash']=hashlib.sha256(s.encode()).hexdigest()
  p['clinicalAvailable']=bool(p.get('posology') and p.get('withdrawal'))
 except Exception as e:p['clinicalAvailable']=False;p['fetchError']=type(e).__name__
 return p
out=Path('public/medicines');out.mkdir(exist_ok=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for i,p in enumerate(pool.map(enrich,products)):
  products[i]=p
  if i%50==0:print('Fiches',i+1,'/',len(products),flush=True)
date=datetime.datetime.now(datetime.timezone.utc).isoformat()
# Small chunks stay below Workbox's per-file precache limit and remain reproducible.
chunks=[]
for start in range(0,len(products),40):
 name=f'rcp-{start//40:03}.json';chunk=products[start:start+40];chunks.append(name)
 (out/name).write_text(json.dumps(chunk,ensure_ascii=False,separators=(',',':'))+'\n')
 for p in chunk:p['chunk']=name
indexData={'source':'Anses / ANMV — index public des RCP','sourceUrl':BASE,'fetchedAt':date,'coverage':'Index avec espèce bovine explicite et lien RCP. Instantané, non exhaustif ; vérifier la version et l’AMM dans le RCP officiel.','products':[{k:v for k,v in p.items() if k not in ['posology','withdrawal','precautions']} for p in products]}
(out/'index.json').write_text(json.dumps(indexData,ensure_ascii=False,separators=(',',':'))+'\n')
print('FIN',len(products),'produits,',sum(p['clinicalAvailable'] for p in products),'fiches textuelles exploitables',flush=True)
