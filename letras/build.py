import json,glob,re,unicodedata,sys
S=json.load(open('songs.json'))
def norm(t): return re.sub(r'[^a-z0-9 ]','',unicodedata.normalize('NFKD',t.lower()).encode('ascii','ignore').decode()).strip()
def clean(s): return s.replace('*','')
YT="https://www.youtube.com/@lasmarikarmen"
ALB="Nos pegan (2023)"
KIL="https://www.instagram.com/kiltreoskuro"
CAPI="https://www.instagram.com/capitano_barbaconyo"
PROD="Suzio Tarik, Slowbou, Carlo Jurancelli"
# Texts starting with "@" are keys in ../content/text.yaml (translated per site language);
# "@key:N" fills {n}; "@page:slug" links to that page of the site in the visitor's language.
MUS=("@nav_music","@page:musica")
SPOT_TR=("Spotify","https://open.spotify.com/track/7rVY7nSi1jSgkNe6u7987Z")
def track(n,extra=None,more=None):
    return {"text":[f"@lyr_d_track:{n}"]+(extra or []),"credits":[("@lyr_c_album",ALB),("@lyr_c_prod_album",PROD)]+(more or []),"src":[MUS]}
D={}
D['69']=track(9)
D['8000']={"video":"SLqGfI1X_9A","text":[],"credits":[]}
D['abuelita']={"video":"ou99LABzxKU","text":["@lyr_d_abuelita1","@lyr_d_abuelita2"],"credits":[("@lyr_c_with","Capitano Barbaconyo",CAPI)],"src":[("SoundCloud","https://soundcloud.com/lasmarikarmen")]}
D['alta bajeza']={"video":"KQJ2nJZBHCs","text":[],"credits":[("@lyr_c_with","Kiltreo Oskuro",KIL)],"src":[MUS]}
D['amantalak']=track(6)
D['nos pegan']=track(1)
D['nos pegan']['src']=[MUS,("@nav_show","@page:espectaculo")]
D['compost']={"video":"JFXqMnMFqnI","text":["@lyr_d_compost"],"credits":[("@lyr_c_first_album","Compost your Gender (2021)"),("@lyr_c_with","Capitano Barbaconyo",CAPI)],"src":[MUS]}
D['el afilador']=track(5,["@lyr_d_single:2023"]); D['el afilador']['video']="8dQ9giAwwBE"
D['electrodomesticos']={"video":"6WE9o7PjveA","text":[],"credits":[]}
D['ladyboi']={"video":"mYE5oTtRIMw","text":["@lyr_d_ladyboi"],"credits":[("@lyr_c_with","Capitano Barbaconyo",CAPI)],"src":[("SoundCloud","https://soundcloud.com/lasmarikarmen")]}
D['lagrimas']={"video":"b6LuZoB04w0","text":[],"credits":[]}
D['me se sale']={"video":"hXvmgjbpTI0","text":[],"credits":[]}
D['patadas']=track(7)
D['pelaso']={"video":"IFF7f8r7nbA","text":[],"credits":[("@lyr_c_prod","Carlo Jurancelli")],"src":[MUS]}
D['petaca']=track(8)
D['poca ropa']={"video":"DgmGpjpw-Pk","text":["@lyr_d_pocaropa1","@lyr_d_pocaropa2"],
 "credits":[("@lyr_c_vocals","Victoria Sickness, La Maga"),("@lyr_c_clarinet","Hipogrifa"),("@lyr_c_bari","Contàmina Perpétua"),("@lyr_c_musprod","Carlo Jurancelli"),("@lyr_c_direction","Las Marikarmen"),("@lyr_c_editing","tyle fernández"),("@lyr_c_camera_photo","Àmal Benelmekki, Sergio L, Pat Garrido, Àlbert Garcia"),("@lyr_c_thanks","@lyr_cv_thanks")],
 "links":[("@lyr_l_wacha","https://www.youtube.com/watch?v=K9G7XC3IBqU")],"src":[]}
D['raton']={"video":"k4cl3OAWrPg","text":["@lyr_d_single:2022"],"credits":[("@lyr_c_with","Kiltreo Oskuro",KIL)],"src":[SPOT_TR]}
D['secuestro']=track(3)
D['sissy']={"video":"hxHuym02RKc","text":["@lyr_d_sissy1","@lyr_d_sissy2"],
 "credits":[("@lyr_c_camera_edit","Mónica Romero"),("@lyr_c_post","Bicialta"),("@lyr_c_sound","Shaman Sound Barcelona"),("@lyr_c_drums_voice","Remy Troubadour"),("@lyr_c_keys","Masha Satskaia"),("@lyr_c_tenor","Victoria Sickness"),("@lyr_c_bari","tyle fernández")],"src":[]}
D['tiene un brillito']=track(4)
D['travestis']=track(2,["@lyr_d_travestis"]); D['travestis']['src']=[MUS,SPOT_TR]
def find_desc(title):
    n=norm(title)
    for k,v in D.items():
        if n.startswith(norm(k)): return v
    return {"text":[],"credits":[]}
out=[]
for si,s in enumerate(S):
    f=glob.glob(f'out/{si:02d}-*.json')[0]; t=json.load(open(f))
    tb={b['block']:b for b in t['blocks']}
    qs={}
    for q in t.get('questions',[]): qs.setdefault(q['block'],[]).append({"line":q['line'],"original":clean(q.get('original','')),"issue":q.get('issue','')})
    seen={}; blocks=[]; after=False
    for bi,b in enumerate(s['blocks']):
        if b['k']=='hr': blocks.append({"hr":True}); after=True; continue
        if b['k']!='p': continue
        key='\n'.join(b['lines'])
        if not key.strip(): continue
        src=seen.setdefault(key,bi)
        tbk=tb.get(src)
        if not tbk: print('no tr',s['title'],bi); continue
        segs=[]
        for g in tbk['segments']:
            segs.append({"from":g['from'],"to":g['to'],"lang":g['lang'],"skip":bool(g.get('skip')),"keep":bool(g.get('keep')),
                "o":[clean(x).replace('Jurancelli','Jurancelli') for x in g['orig']],
                **{k:([clean(x) for x in g[k]] if g.get(k) else None) for k in('es','en','ca','gl','eu','pt','fr','it','de','ja')}})
        blocks.append({"segs":segs,"qs":(qs.get(src,[]) if src==bi else qs.get(src,[])),"after":after})
    # drop trailing hr
    while blocks and blocks[-1].get('hr'): blocks.pop()
    d=dict(find_desc(s['title']))
    title=s['title']
    m=re.search(r'\s+con\s+Capitano Barbaco[ñn]o\s*$',title)
    if m:
        title=title[:m.start()]
    out.append({"title":title,"slug":norm(title).replace(' ','-'),"blocks":blocks,"desc":d})
out.sort(key=lambda s:norm(s['title']))
json.dump(out,open('data.json','w'),ensure_ascii=False)
import yaml
T=yaml.safe_load(open('../content/text.yaml',encoding='utf-8'))
def R(v):
    if not isinstance(v,str) or not v.startswith('@'): return v
    k,_,n=v[1:].partition(':')
    if k=='page': return f"https://ciavendaval.github.io/lasmarikarmen-web/{n}.html"
    return str(T[k]['es']).replace('{n}',n)
def RD(x):
    if isinstance(x,list): return [RD(i) for i in x]
    if isinstance(x,tuple): return [RD(i) for i in x]
    if isinstance(x,dict): return {k:RD(v) for k,v in x.items()}
    return R(x)
out=[dict(s,desc=RD(s['desc'])) for s in out]
tpl=open('template.html').read()
for name,emb in (('embed',True),('preview',False)):
    h=tpl.replace('__EMBED__','true' if emb else 'false').replace('__DATA__',json.dumps(out,ensure_ascii=False).replace('</','<\\/'))
    open(f'page-{name}.html','w').write(h)
    print(name,len(h))
print([s['title'] for s in out])
