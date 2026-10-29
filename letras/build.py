import json,glob,re,unicodedata,sys
S=json.load(open('songs.json'))
def norm(t): return re.sub(r'[^a-z0-9 ]','',unicodedata.normalize('NFKD',t.lower()).encode('ascii','ignore').decode()).strip()
def clean(s): return s.replace('*','')
YT="https://www.youtube.com/@lasmarikarmen"
ALB="Nos pegan (2023)"
KIL="https://www.instagram.com/kiltreoskuro"
CAPI="https://www.instagram.com/capitano_barbaconyo"
PROD="Suzio Tarik, Slowbou, Carlo Jurancelli"
MUS=("lasmarikarmen.com","musica.html")
SPA=("Spotify","https://open.spotify.com/album/0K5Uj5ANW0CpvLUnNLWD9D")
def track(n,extra=None,more=None):
    d={"text":[f"Pista {n} de 9 del disco Nos pegan (2023)."]+(extra or []),"credits":[("Disco",ALB),("Producción del disco",PROD)]+(more or []),"src":[MUS]}
    return d
D={}
D['69']=track(9)
D['8000']={"video":"SLqGfI1X_9A","text":[],"credits":[]}
D['abuelita']={"video":"ou99LABzxKU","text":["Publicada en SoundCloud el 13 de julio de 2020. El vídeo enlazado es la versión en directo en Paral·lel 62.","Las abuelitas folclóricas son una de las pasiones declaradas de la banda."],"credits":[],"src":[("SoundCloud","https://soundcloud.com/lasmarikarmen"),("YouTube","https://www.youtube.com/watch?v=hxHuym02RKc")]}
D['alta bajeza']={"video":"KQJ2nJZBHCs","text":["Single con Kiltreo Oskuro."],"credits":[("Con","Kiltreo Oskuro",KIL)],"src":[MUS]}
D['amantalak']=track(6)
D['nos pegan']=track(1,["Es también el título del espectáculo de 60 minutos: el funeral folclórico de Lady Marikarmen convertido en fiesta multimedia, con electrónica, vientos en directo, drag, vídeo y una columna de humo sincronizada al beat."])
D['nos pegan']['src']=[MUS,("espectáculo","espectaculo.html")]
D['compost']={"video":"JFXqMnMFqnI","text":["Título del primer álbum de la banda (2021): «Composta, recicla y repiensa la manera en que percibes el género.»"],"credits":[("Álbum","Compost your Gender (2021)")],"src":[MUS]}
D['el afilador']=track(5,["Single de 2023."],[("Con","Suzio Tarik")]); D['el afilador']['video']="8dQ9giAwwBE"
D['electrodomesticos']={"video":"6WE9o7PjveA","text":[],"credits":[]}
D['ladyboi']={"video":"mYE5oTtRIMw","text":["Publicada en SoundCloud el 7 de marzo de 2021."],"credits":[],"src":[("SoundCloud","https://soundcloud.com/lasmarikarmen")]}
D['lagrimas']={"video":"b6LuZoB04w0","text":[],"credits":[]}
D['me se sale']={"video":"hXvmgjbpTI0","text":[],"credits":[]}
D['patadas']=track(7)
D['pelaso']={"video":"IFF7f8r7nbA","text":["Single de Las Marikarmen."],"credits":[("Producción","Carlo Jurancelli")],"src":[MUS]}
D['petaca']=track(8)
D['poca ropa']={"video":"DgmGpjpw-Pk","text":["Una reclamación poderosa y reivindicativa de los espacios públicos por personas disidentes de género y queer, que nace de la autodefensa ante las agresiones al colectivo LGBTI+ en la calle.","Primera colaboración musical de Las Marikarmen con la rapera argentina La Maga. Videoclip publicado el 3 de marzo de 2022; salió como single el 4 de marzo de 2022."],
 "credits":[("Voces","Victoria Sickness, La Maga"),("Clarinete","Hipogrifa"),("Saxo barítono","Contàmina Perpétua"),("Producción musical","Carlo Jurancelli"),("Dirección","Las Marikarmen"),("Edición","Tyle Fernández"),("Cámara y fotografía","Àmal Benelmekki, Sergio L, Pat Garrido, Àlbert Garcia"),("Gracias","Cowper Films y la crew de skaters que se sumó al rodaje")],
 "links":[("En directo, Fiesta Wacha · Sala Upload (7 enero 2023)","https://www.youtube.com/watch?v=K9G7XC3IBqU")],"src":[("YouTube","https://www.youtube.com/watch?v=DgmGpjpw-Pk")]}
D['raton']={"video":"k4cl3OAWrPg","text":["Single de 2022."],"credits":[("Con","Kiltreo Oskuro",KIL)],"src":[("Spotify","https://open.spotify.com/track/7rVY7nSi1jSgkNe6u7987Z")]}
D['secuestro']=track(3)
D['sissy']={"video":"hxHuym02RKc","text":["Primer videoclip de Las Marikarmen (17 de mayo de 2019, 4:24): cabaret musical queer-punk de Barcelona que mezcla la fuerza de una banda de metales con el arte del drag y reescribe en clave transfeminista tus temazos pop.","Inspirada en «Sissy That Walk» de RuPaul y «Satisfaction» de Benny Benassi."],
 "credits":[("Cámara y edición","Mónica Romero"),("Postproducción","Bicialta"),("Sonido","Shaman Sound Barcelona"),("Batería y voz","Remy Troubadour"),("Teclado","Masha Satskaia"),("Saxo tenor","Victoria Sickness"),("Saxo barítono","tyle fernández")],"src":[("YouTube","https://www.youtube.com/watch?v=hxHuym02RKc")]}
D['tiene un brillito']=track(4)
D['travestis']=track(2,["Existe también una versión en directo, publicada como single en 2026."],[("Con","Suzio Tarik")]); D['travestis']['src']=[MUS,("Spotify","https://open.spotify.com/track/7rVY7nSi1jSgkNe6u7987Z")]
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
                "o":[clean(x).replace('Juranccelli','Jurancelli') for x in g['orig']],
                **{k:([clean(x) for x in g[k]] if g.get(k) else None) for k in('en','es','eu')}})
        blocks.append({"segs":segs,"qs":(qs.get(src,[]) if src==bi else qs.get(src,[])),"after":after})
    # drop trailing hr
    while blocks and blocks[-1].get('hr'): blocks.pop()
    d=dict(find_desc(s['title']))
    title=s['title']
    m=re.search(r'\s+con\s+Capitano Barbaco[ñn]o\s*$',title)
    if m:
        title=title[:m.start()]
        d['credits']=list(d.get('credits',[]))+[("Con","Capitano Barbaconyo",CAPI)]
    out.append({"title":title,"slug":norm(title).replace(' ','-'),"blocks":blocks,"desc":d})
out.sort(key=lambda s:norm(s['title']))
tpl=open('template.html').read()
for name,emb in (('embed',True),('preview',False)):
    h=tpl.replace('__EMBED__','true' if emb else 'false').replace('__DATA__',json.dumps(out,ensure_ascii=False).replace('</','<\\/'))
    open(f'page-{name}.html','w').write(h)
    print(name,len(h))
print([s['title'] for s in out])
