# Junta frames soltos do Gridwright Space Shooter em tiras (sem alterar píxeis).
from PIL import Image
G = 'tools/gridwright/'
def strip(names, size, out):
    im = Image.new('RGBA', (size * len(names), size), (0, 0, 0, 0))
    for i, n in enumerate(names): im.paste(Image.open(G + n).convert('RGBA'), (i * size, 0))
    im.save(out); print(out, im.size)
strip([f'plasma_yellow_f{i}.png' for i in (1, 2)], 16, 'assets/fx/tiro_mech.png')
strip([f'plasma_blue_f{i}.png' for i in (1, 2)], 16, 'assets/fx/tiro_torre.png')
strip([f'explosion_small_f{i}.png' for i in range(1, 7)], 16, 'assets/fx/explosao_peq.png')
strip([f'explosion_large_f{i}.png' for i in range(1, 9)], 32, 'assets/fx/explosao_grande.png')
strip([f'hit_spark_f{i}.png' for i in range(1, 4)], 16, 'assets/fx/impacto.png')
