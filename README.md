<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3404b6cc-7a53-4a31-9e57-32c0a09303b8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Meta Quest 3: menú VR y voz de la guía

- **Menú en VR**: el HUD HTML no se dibuja dentro de la sesión inmersiva del Quest, por eso se agregó un menú 3D
  (estaciones, grúa, palanca, diagnóstico, alerta, audio). Apunta con el láser y usa el gatillo. Los botones **X / Y**
  del mando izquierdo lo ocultan o muestran.
- **Voz de la guía**: el Quest Browser no trae voces para `speechSynthesis`, así que la guía reproduce archivos mp3
  desde `public/audio/` (`guia-1.mp3`, `guia-2.mp3`, `guia-3.mp3`). Genéralos una vez con:
  `pip install edge-tts` y `python scripts/generar-audios-guia.py`. Sin los archivos, la guía muestra subtítulos
  en VR y usa la voz del navegador solo como respaldo.
