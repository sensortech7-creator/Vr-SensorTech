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


## Correcciones para Meta Quest 3

- Se amplió el cierre del entorno 3D (paredes laterales, techo y extremos) para reducir los huecos visibles al girar la cabeza en modo VR.
- La narración del guía usa tres archivos MP3 locales en `public/audio/`, porque la disponibilidad de `speechSynthesis` y sus voces varía en el navegador de Meta Quest. La reproducción se inicia tras la interacción del usuario.
- Mantén la carpeta `public/audio/` al desplegar; Vite resuelve la ruta con `BASE_URL`.

Prueba recomendada: ejecuta `npm install` y `npm run build`, despliega la carpeta `dist` mediante HTTPS y abre el sitio en el navegador de Meta Quest 3. Pulsa **Empezar recorrido y activar audio** y después prueba los tres puntos de recorrido.
