# Reduz para metade os insetos Foozle (CC0) usados pelo Enxame, com o mesmo método do mech:
# cores claras do bloco 2x2 e contorno de 1 px refeito por fora. Gera também a explosão pequena.
# Saída por inseto: 9 linhas de 32 px: 0-2 parado, 3-5 mover, 6-8 morrer (cada grupo: baixo, cima, lado).
from PIL import Image
import numpy as np
from collections import Counter
OUT = (24, 16, 22, 255)
def down2(im, outline=True):
    a = np.array(im).astype(int); h, w = a.shape[0] // 2, a.shape[1] // 2
    o = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        for x in range(w):
            px = [tuple(p) for p in a[2*y:2*y+2, 2*x:2*x+2].reshape(4, 4) if p[3] > 0]
            if len(px) < 2: continue
            light = [p for p in px if p[0] + p[1] + p[2] >= 150]
            o[y, x] = Counter(light or px).most_common(1)[0][0]
    if not outline: return Image.fromarray(o)
    al = o[:, :, 3] > 0; r = o.copy()
    for y in range(h):
        for x in range(w):
            if not al[y, x] and any(0 <= y+dy < h and 0 <= x+dx < w and al[y+dy, x+dx] for dy, dx in ((1,0),(-1,0),(0,1),(0,-1))):
                r[y, x] = OUT
    return Image.fromarray(r)
# Largura de cada frame na folha original: Leafbug 64 px, Firebug 128 px (o bicho fica ao centro).
for name, out, fw in [('Leafbug', 'larva', 64), ('Firebug', 'bruto', 128)]:
    im = Image.open(f'tools/{name}.png').convert('RGBA'); cols = im.size[0] // fw
    sheet = Image.new('RGBA', (cols * fw // 2, 9 * 32), (0, 0, 0, 0))
    for r in range(9):
        for c in range(cols):
            cell = im.crop((c * fw, r * 64, c * fw + fw, (r + 1) * 64))
            if cell.getbbox(): sheet.paste(down2(cell), (c * fw // 2, r * 32))
    sheet.save(f'assets/enemies/{out}.png'); print(out, sheet.size)

# Rastejador do kit craftpix (2 diagonais, 6 frames de 48 px) reduzido para células de 24 px
for src, out in [('tools/alien_run_sd.png', 'assets/enemies/alien_sd_small.png'), ('tools/alien_run_su.png', 'assets/enemies/alien_su_small.png')]:
    im = Image.open(src).convert('RGBA'); n = im.size[0] // 48
    sheet = Image.new('RGBA', (n * 24, 24), (0, 0, 0, 0))
    for i in range(n): sheet.paste(down2(im.crop((i * 48, 0, i * 48 + 48, 48))), (i * 24, 0))
    sheet.save(out); print(out, sheet.size)

# Colono (Space Crew, frames 16x32, 7 colunas x 4 linhas) reduzido para 8x16, à escala dos soldados
im = Image.open('tools/colono_16px.png').convert('RGBA')
sheet = Image.new('RGBA', (7 * 8, 4 * 16), (0, 0, 0, 0))
for r in range(4):
    for c in range(7):
        sheet.paste(down2(im.crop((c * 16, r * 32, c * 16 + 16, r * 32 + 32))), (c * 8, r * 16))
sheet.save('assets/infantry/colono.png'); print('colono', sheet.size)
