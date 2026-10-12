"""
Genera la voz de la guía (public/audio/guia-1.mp3, guia-2.mp3, guia-3.mp3).

Uso (necesita internet, una sola vez):
    pip install edge-tts
    python scripts/generar-audios-guia.py

Si cambias los textos, cámbialos también en GUIDE_TEXTS de src/services/audioService.ts
(o simplemente graba tu propia voz y guarda los archivos con esos mismos nombres).
"""
import asyncio
from pathlib import Path

import edge_tts

VOICE = "es-MX-DaliaNeural"   # alternativas: es-MX-JorgeNeural, es-ES-ElviraNeural
OUT = Path(__file__).resolve().parent.parent / "public" / "audio"

TEXTS = {
    1: "Bienvenido a la planta principal de producción. En estas instalaciones implementamos los lineamientos de la Industria 4.0 mediante SensorTech, nuestro sistema avanzado de mantenimiento predictivo diseñado para optimizar las máquinas de inyección.",
    2: "Esta es una de nuestras estaciones de inyección. Como puedes ver, cuenta con módulos sensoriales compactos instalados: ESP32 con sensores BME280, acelerómetros para vibración y monitoreo de corriente en tiempo real.",
    3: "Punto 03: Dashboard de Machine Learning. Toda la información capturada en la planta viaja a nuestro servidor central, procesando modelos predictivos para calcular la vida útil restante y anticipar cualquier anomalía.",
}


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for n, text in TEXTS.items():
        destino = OUT / f"guia-{n}.mp3"
        await edge_tts.Communicate(text, VOICE, rate="-4%").save(str(destino))
        print("OK", destino)


asyncio.run(main())
