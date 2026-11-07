# Converte os sons escolhidos (tools/sfx_src, originais intactos) para MP3 mono curtos em assets/sfx.
# nome no jogo: (ficheiro original, duração máxima em segundos ou None, volume)
import subprocess
M = {
 'tiro_mech': ('07_Weapon_Shot_SciFi.wav.wav', 0.35, 0.7),            # Sci-Fi Weapons & Impacts (FREE)
 'tiro_torre': ('08_Weapon_Shot_SciFi.wav.wav', 0.4, 0.7),
 'impacto': ('WPEN_LaserImpactv01_BLDM_PSFX01.wav', None, 0.8),       # Procedural Sci-Fi SFX sampler
 'morte_inseto': ('IMPT_FleshSmallv03_BLDM_PSFX01.wav', None, 1.0),
 'explosao_peq': ('RETR_ExplodePurev01_BLDM_PSFX01.wav', None, 1.0),
 'explosao_grande': ('04_Impact_Heavy.wav.wav', 1.6, 1.0),
 'pod_queda': ('thruster-burst.wav', None, 0.8),                     # Free Sci-Fi Sounds
 'pod_aterra': ('06_Impact_Object_Drop.wav.wav', 1.2, 1.0),
 'modulo_pronto': ('SFGN_EnergyDeepSnapNear07v01_BLDM_PSFX01.wav', None, 1.0),
 'mech_pronto': ('MECH_DoorOpenv01_BLDM_PSFX01.wav', None, 1.0),
 'clique': ('UIBT_KeyPressv01_BLDM_PSFX01.wav', None, 0.8),
 'ordem': ('interface-tick.wav', None, 0.6),
 'recusado': ('computer-denied.wav', None, 0.8),
 'vaga': ('AMBD_DreadSwellv01_BLDM_PSFX01.wav', 2.6, 1.0),
 'ataque': ('SHIP_Scanner25v01_BLDM_PSFX01.wav', None, 0.9),
 'vitoria': ('hologram-on.wav', None, 1.0),
 'derrota': ('robot-power-down.wav', None, 1.0),
}
for name, (fn, dur, vol) in M.items():
    af = f'volume={vol}' + (f',afade=t=out:st={dur - 0.12}:d=0.12' if dur else '')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'tools/sfx_src/{fn}'] + (['-t', str(dur)] if dur else [])
                   + ['-ac', '1', '-ar', '44100', '-af', af, '-b:a', '80k', f'assets/sfx/{name}.mp3'], check=True)
print('ok', len(M))
