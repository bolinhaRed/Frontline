# Copia as peças do kit Gridwright Sci-Fi HUD (tema ciano, 1x) usadas na interface, sem as alterar.
import shutil, glob, os
for f in glob.glob('tools/gw/*.png'):
    shutil.copy(f, 'assets/ui/gw/' + os.path.basename(f))
print(sorted(os.listdir('assets/ui/gw')))
