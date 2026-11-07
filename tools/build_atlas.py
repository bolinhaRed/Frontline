# Recorta (sem alterar píxeis) os hexes escolhidos das folhas 1x para um atlas único.
# Cada célula da folha: 32x32, origem x=36c+4, y=36r+2; base do hex em y=31.
import json
from PIL import Image, ImageDraw
CAT = {
 'solo':       {'nome':'Solo marciano','custo':1,'visao':False,'v':[('mars',0,6),('mars',1,0),('mars',0,1),('mars',1,1),('mars',0,2)]},
 'pedregoso':  {'nome':'Solo pedregoso','custo':1,'visao':False,'v':[('mars',0,3),('mars',0,4)]},
 'cratera':    {'nome':'Cratera','custo':2,'visao':False,'v':[('mars',0,0),('mars',0,5)]},
 'rocha':      {'nome':'Rocha escura','custo':1,'visao':False,'v':[('d3',2,2),('d3',2,3),('d4',0,1),('d2',4,0)]},
 'montanha':   {'nome':'Montanha','custo':0,'visao':True,'v':[('d3',2,1),('d3',5,4),('d4',2,4),('d4',2,5),('d4',0,0)]},
 'vulcao':     {'nome':'Vulcão','custo':0,'visao':True,'v':[('d3',5,5),('d3',2,0)]},
 'lava':       {'nome':'Lava','custo':0,'visao':False,'v':[('d1',3,2),('d4',0,2),('d4',0,3)]},
 'agua':       {'nome':'Água','custo':0,'visao':False,'v':[('d2',6,2)]},
 'acido':      {'nome':'Ácido','custo':0,'visao':False,'v':[('d1',3,4),('d4',6,2)]},
 'tempestade': {'nome':'Tempestade de pó','custo':2,'visao':True,'v':[('mars',2,0)]},
 'cristal':    {'nome':'Cristais','custo':0,'visao':False,'v':[('d4',2,0),('d2',3,0),('d3',5,0)]},
 'geiser':     {'nome':'Géiser','custo':0,'visao':False,'v':[('d2',3,3),('d2',3,4)]},
 'creep':      {'nome':'Creep do Enxame','custo':2,'visao':False,'v':[('d4',1,3),('d2',1,0),('d1',4,2)]},
 'plataforma': {'nome':'Plataforma de aterragem','custo':1,'visao':False,'v':[('d1',5,0)]},
 'destrocos':  {'nome':'Destroços','custo':2,'visao':False,'v':[('d1',2,4),('d1',2,6)]},
}
# Módulos da Colónia (tile completo, com o próprio chão)
MOD = {
 'nucleo': ('mars',2,6), 'extrator': ('mars',4,3), 'reator': ('d2',2,4),
 'cupula': ('mars',1,3), 'hangar': ('mars',2,1), 'rele': ('d2',5,0), 'torre': ('d4',5,5),
 'quartel': ('d3',4,0), 'laboratorio': ('mars',5,5), 'refinaria': ('d2',0,5), 'plataforma': ('d1',5,0),
}
sheets = {k: Image.open(f'tools/{k}.png').convert('RGBA') for k in ['mars','d1','d2','d3','d4']}
cells=[]; out={}
for tid,t in CAT.items():
    idx=[]
    for (s,r,c) in t['v']:
        idx.append(len(cells)); cells.append(sheets[s].crop((36*c+4,36*r+2,36*c+36,36*r+34)))
    out[tid]={'nome':t['nome'],'custo':t['custo'],'bloqueiaVisao':t['visao'],'variantes':idx}
modidx={}
for mid,(sname,r,c) in MOD.items():
    modidx[mid]=len(cells); cells.append(sheets[sname].crop((36*c+4,36*r+2,36*c+36,36*r+34)))
cols=8; rows=(len(cells)+cols-1)//cols
atlas=Image.new('RGBA',(cols*32,rows*32),(0,0,0,0))
for i,c in enumerate(cells): atlas.paste(c,((i%cols)*32,(i//cols)*32))
atlas.save('assets/tiles/hex_atlas.png')
open('js/data/terrain.js','w').write('// Gerado por tools/build_atlas.py — não editar à mão.\nexport const TERRAIN = '+json.dumps({'celula':32,'colunas':cols,'terrenos':out,'modulos':modidx},ensure_ascii=False,indent=1)+';\n')
big=atlas.resize((atlas.size[0]*3,atlas.size[1]*3),Image.NEAREST)
bg=Image.new('RGBA',big.size,(40,40,48,255)); bg.alpha_composite(big)
d=ImageDraw.Draw(bg)
for tid,t in out.items():
    for i in t['variantes']: d.text(((i%cols)*96+2,(i//cols)*96+2),tid[:7],fill=(255,255,0,255))
bg.save('/home/claude/atlas_check.png')
print(len(cells),'tiles')
