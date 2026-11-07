# Música: faixas fornecidas pelo Vasco (confirmar a licença antes de publicar).
# Converte as músicas do Vasco (tools/music_src, originais intactos) para OGG Opus 40 kb/s, com volume igualado (-18 LUFS).
# O nome de saída diz o momento do jogo: titulo, mapa_*, jogo_*, tensao_*.
import subprocess
M = {
 'titulo': 'Space_Main_Theme.mp3',
 'mapa_1': 'Milky_Way.m4a', 'mapa_2': 'Astral_Float.m4a',
 'jogo_1': 'Exploring_the_new_planets.m4a', 'jogo_2': 'Industrial_Planet.mp3', 'jogo_3': 'Exploding_Sun.mp3',
 'tensao_1': 'Star_Militia.mp3', 'tensao_2': 'AI_Malware.m4a', 'tensao_3': 'Crusing_through_the_astroid_rain.m4a',
}
for name, fn in M.items():
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'tools/music_src/{fn}', '-vn', '-af', 'loudnorm=I=-18:TP=-2:LRA=11',
                    '-ar', '48000', '-c:a', 'libopus', '-b:a', '40k', f'assets/music/{name}.ogg'], check=True)
print('ok', len(M))
