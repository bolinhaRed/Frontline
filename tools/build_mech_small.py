# Gera assets/units/mech_small.png: o mech (corpo + arma) reduzido para metade, a pedido do Vasco.
# Os PNG originais não são alterados. Cada célula tem 24x24.
# Linhas: variante do corpo (Walk1, Walk2, Walk2 espelhado, Walk3) x 4 frames = 16 linhas.
# Colunas: 9 ângulos da arma + os mesmos 9 espelhados = 18 colunas.
from PIL import Image, ImageOps
import numpy as np
from collections import Counter

OUT = (41, 14, 38, 255)  # cor do contorno do kit

# Reduz para metade: cada píxel novo fica com a cor clara mais frequente do bloco 2x2
# (o contorno original é ignorado) e no fim volta a desenhar-se um contorno de 1 px por fora.
def down2(im):
    a = np.array(im).astype(int); h, w = a.shape[0] // 2, a.shape[1] // 2
    o = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        for x in range(w):
            px = [tuple(p) for p in a[2*y:2*y+2, 2*x:2*x+2].reshape(4, 4) if p[3] > 0]
            if len(px) < 3: continue
            light = [p for p in px if p[0] + p[1] + p[2] >= 180]
            o[y, x] = Counter(light or px).most_common(1)[0][0]
    al = o[:, :, 3] > 0; r = o.copy()
    for y in range(h):
        for x in range(w):
            if not al[y, x] and any(0 <= y+dy < h and 0 <= x+dx < w and al[y+dy, x+dx] for dy, dx in ((1,0),(-1,0),(0,1),(0,-1))):
                r[y, x] = OUT
    return Image.fromarray(r)

walk = {k: Image.open(f'assets/units/Walk{k}.png').convert('RGBA') for k in (1, 2, 3)}
frame = lambda sheet, i: sheet.crop((i * 48, 0, i * 48 + 48, 48))
bodies = [(1, False), (2, False), (2, True), (3, False)]
# Uma folha por arma: 1 = Atirador (mech_small.png); 3 = Caçadeira, 4 = Laser, 6 = Lança-rockets (mech_small_<n>.png)
for arma in (1, 3, 4, 6):
    gun = Image.open(f'assets/units/armas/{arma}.png').convert('RGBA')
    out = Image.new('RGBA', (18 * 24, 16 * 24), (0, 0, 0, 0))
    for bi, (k, flip) in enumerate(bodies):
        for f in range(4):
            body = frame(walk[k], f)
            if flip: body = ImageOps.mirror(body)
            for gi in range(18):
                g = frame(gun, gi % 9)
                if gi >= 9: g = ImageOps.mirror(g)
                comp = body.copy(); comp.alpha_composite(g)
                out.paste(down2(comp), (gi * 24, (bi * 4 + f) * 24))
    name = 'assets/units/mech_small.png' if arma == 1 else f'assets/units/mech_small_{arma}.png'
    out.save(name); print(name, out.size)
