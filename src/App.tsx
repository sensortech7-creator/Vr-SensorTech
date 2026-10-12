import React, { useEffect, useState, useRef } from 'react';
import {
  Volume2, VolumeX, Play, Move, Sliders, Sparkles, Radio, Activity, Cpu, Maximize2, Minimize2
} from 'lucide-react';
import { registerAFrameComponents } from './components/aframe-components';
import { audioService } from './services/audioService';
import { ScreenCanvasManager, SensorData } from './services/screenCanvases';

export default function App() {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeWaypoint, setActiveWaypoint] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(true);

  const sensorStateRef = useRef<SensorData>({
    temperature: 219.5, pressure: 1012.3, humidity: 41.5, vibration: 3.72,
    current: 43.4, status: 'normal', anomalySimulated: false,
    diagnosticActive: false, rulHours: 1420
  });

  const [sensorData, setSensorData] = useState<SensorData>(sensorStateRef.current);
  const canvasManagerRef = useRef<ScreenCanvasManager | null>(null);

  const applySensorUpdate = (patch: Partial<SensorData>) => {
    sensorStateRef.current = { ...sensorStateRef.current, ...patch };
    const current = sensorStateRef.current;
    if (canvasManagerRef.current) canvasManagerRef.current.update(current);
    setSensorData({ ...current });
  };

  useEffect(() => {
    registerAFrameComponents();
    if (!canvasManagerRef.current) canvasManagerRef.current = new ScreenCanvasManager();

    const timer = setInterval(() => {
      const prev = sensorStateRef.current;
      const jitter = (Math.random() - 0.5);
      const nextTemp = prev.anomalySimulated ? 256.4 + jitter * 2.2 : (prev.diagnosticActive ? 222.1 + jitter * 0.3 : 219.5 + jitter * 0.4);
      const nextPress = prev.status === 'purging' ? 420.0 + jitter * 5.0 : 1012.3 + jitter * 1.5;
      const nextHum = 41.5 + jitter * 0.2;
      const nextVib = prev.anomalySimulated ? 7.45 + jitter * 0.8 : (prev.status === 'purging' ? 5.2 : 3.72 + jitter * 0.15);
      const nextCurr = prev.status === 'purging' ? 58.4 : 43.4 + jitter * 0.5;

      applySensorUpdate({ temperature: nextTemp, pressure: nextPress, humidity: nextHum, vibration: nextVib, current: nextCurr });
    }, 350);

    const handleWaypointEvent = (e: any) => { if (e.detail && e.detail.pointId) setActiveWaypoint(e.detail.pointId); };
    const handleScreenActionEvent = (e: any) => {
      const action = e.detail && e.detail.action;
      if (action === 'diagnostic') runAIDiagnostic();
      else if (action === 'test-alert' || action === 'anomaly') toggleAnomalyMode();
      else if (action === 'calibrate' || action === 'reset') resetAndCalibrate();
      else if (action === 'purge') triggerMachinePurge();
      else if (action === 'move-crane') triggerCraneMove();
    };
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);

    window.addEventListener('sensortech:waypoint-selected', handleWaypointEvent);
    window.addEventListener('sensortech:screen-action', handleScreenActionEvent);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const unlockHandler = () => {
      audioService.unlock();
      setIsAudioUnlocked(true);
    };
    window.addEventListener('pointerdown', unlockHandler, { once: true });
    window.addEventListener('keydown', unlockHandler, { once: true });

    return () => {
      clearInterval(timer);
      window.removeEventListener('sensortech:waypoint-selected', handleWaypointEvent);
      window.removeEventListener('sensortech:screen-action', handleScreenActionEvent);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };
  }, []);

  const handleStartExperience = () => {
    // SIN RETRASOS NI AWAIT PARA QUE META QUEST NO BLOQUEE LA VOZ
    audioService.unlock();
    setIsAudioUnlocked(true);
    setShowHelpModal(false);
    audioService.speakWaypoint(1);
  };

  const handleToggleMute = () => setIsMuted(audioService.toggleMute());
  
  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const runAIDiagnostic = () => {
    audioService.unlock();
    audioService.playStartupChime();
    applySensorUpdate({ diagnosticActive: true, status: 'diagnostic' });
    setTimeout(() => {
      audioService.playBeep(true);
      applySensorUpdate({ diagnosticActive: false, status: sensorStateRef.current.anomalySimulated ? 'alert' : 'normal', rulHours: 1420 });
    }, 3200);
  };

  const toggleAnomalyMode = () => {
    audioService.unlock();
    const nextState = !sensorStateRef.current.anomalySimulated;
    if (nextState) {
      audioService.playAlert();
      applySensorUpdate({ anomalySimulated: true, temperature: 258.4, vibration: 7.42, status: 'alert', rulHours: 120 });
    } else {
      audioService.playBeep(true);
      applySensorUpdate({ anomalySimulated: false, temperature: 219.5, vibration: 3.72, status: 'normal', rulHours: 1420 });
    }
  };

  const resetAndCalibrate = () => {
    audioService.unlock();
    audioService.playBeep(true);
    applySensorUpdate({ anomalySimulated: false, diagnosticActive: false, temperature: 219.5, pressure: 1012.3, vibration: 3.72, status: 'normal', rulHours: 1420 });
  };

  const triggerMachinePurge = () => {
    audioService.unlock();
    const leverEl = document.querySelector('[interactive-lever]') as any;
    if (leverEl) leverEl.emit('pull');
    applySensorUpdate({ status: 'purging', pressure: 420.0, vibration: 5.2 });
    setTimeout(() => {
      applySensorUpdate({ status: sensorStateRef.current.anomalySimulated ? 'alert' : 'normal', pressure: 1012.3, vibration: sensorStateRef.current.anomalySimulated ? 7.42 : 3.72 });
    }, 1800);
  };

  const triggerCraneMove = () => {
    audioService.unlock();
    const craneLever = document.querySelector('[crane-control-lever]') as any;
    if (craneLever) craneLever.emit('pull');
  };

  const navigateToPoint = (pointId: number) => {
    setActiveWaypoint(pointId);
    audioService.unlock();
    setIsAudioUnlocked(true);
    audioService.playBeep(false);

    let targetX = 0, targetZ = 10, guideX = 2.2, guideZ = 7.2;
    if (pointId === 1) { targetX = 0; targetZ = 10; guideX = 2.2; guideZ = 7.2; }
    else if (pointId === 2) { targetX = -2.8; targetZ = 3.0; guideX = -0.6; guideZ = 1.2; }
    else if (pointId === 3) { targetX = 0; targetZ = -7.5; guideX = 2.5; guideZ = -9.5; }

    const rig = document.querySelector('#rig') as any;
    if (rig) rig.setAttribute('animation', { property: 'position', to: `${targetX} 0 ${targetZ}`, dur: 800, easing: 'easeInOutCubic' });

    const guide = document.querySelector('#virtual-guide-entity') as any;
    if (guide) guide.setAttribute('animation', { property: 'position', to: `${guideX} 1.6 ${guideZ}`, dur: 1100, easing: 'easeInOutQuad' });

    // SIN RETRASOS PARA LA VOZ
    audioService.speakWaypoint(pointId);
  };

  return (
    // CONTENEDOR PRINCIPAL CON ID PARA DOM OVERLAY
    <div id="dom-overlay-container" className="relative w-full h-screen bg-[#0C0E11] text-[#EEF0F2] overflow-hidden select-none">
      
      {/* 2D HUD OVERLAY */}
      <div className="fixed inset-0 pointer-events-none z-[99999999] flex flex-col justify-between p-3 sm:p-5">
        
        {/* Top Header & Action Bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 pointer-events-auto flex-wrap">
          <div className="flex items-center gap-2.5 sm:gap-3 bg-[#14171C]/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shadow-xl">
            <img src="/logo-sensortech.svg" alt="SensorTech Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-xs sm:text-sm tracking-wide text-[#EEF0F2]">SENSORTECH VR</h1>
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-semibold rounded bg-[#21262E] text-[#00E5FF] border border-[#00E5FF]/30">PLANTA 4.0</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#8B93A1]">WebXR &bull; Meta Quest 3 &bull; Mantenimiento Predictivo</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button onClick={triggerCraneMove} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-[#2C323B] hover:bg-[#3A4048] active:bg-[#262B33] border border-[#FFC107]/40 text-xs text-[#EEF0F2] transition shadow cursor-pointer"><Move className="w-4 h-4 text-[#FFC107]" /><span className="hidden md:inline font-semibold">Mover Grúa 10T</span></button>
            <button onClick={triggerMachinePurge} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-[#2C323B] hover:bg-[#3A4048] active:bg-[#262B33] border border-[#E2604F]/40 text-xs text-[#EEF0F2] transition shadow cursor-pointer"><Sliders className="w-4 h-4 text-[#E2604F]" /><span className="hidden md:inline font-semibold">Jalar Palanca</span></button>
            <button onClick={runAIDiagnostic} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-[#2C323B] hover:bg-[#3A4048] active:bg-[#262B33] border border-[#00E5FF]/40 text-xs text-[#00E5FF] transition shadow cursor-pointer"><Sparkles className="w-4 h-4 text-[#00E5FF]" /><span className="hidden md:inline font-semibold">Diagnóstico AI</span></button>
            <button onClick={handleToggleMute} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-[#2C323B] hover:bg-[#3A4048] active:bg-[#262B33] border border-white/10 text-xs text-[#EEF0F2] transition shadow cursor-pointer">
              {isMuted ? <><VolumeX className="w-4 h-4 text-[#E2493D]" /><span className="hidden lg:inline">Silenciado</span></> : <><Volume2 className="w-4 h-4 text-[#00E5FF]" /><span className="hidden lg:inline">Audio VR</span></>}
            </button>
            <button onClick={toggleFullscreenMode} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-[#21262E] hover:bg-[#2C323B] border border-white/10 text-xs text-[#EEF0F2] transition shadow cursor-pointer">
              {isFullscreen ? <><Minimize2 className="w-4 h-4 text-[#FFC107]" /><span className="hidden sm:inline">Restaurar</span></> : <><Maximize2 className="w-4 h-4 text-[#00E5FF]" /><span className="hidden sm:inline">Maximizar</span></>}
            </button>
            <button onClick={() => setShowHelpModal(true)} className="px-2.5 sm:px-3 py-2 rounded-lg bg-[#21262E] hover:bg-[#2C323B] border border-white/10 text-xs text-[#8B93A1] hover:text-[#EEF0F2] transition cursor-pointer">Mandos</button>
          </div>
        </div>

        {/* Bottom Navigation & Live Telemetry Dock */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#14171C]/95 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl overflow-x-auto max-w-full">
            <span className="px-2.5 text-xs font-semibold text-[#8B93A1] hidden sm:inline whitespace-nowrap">Estaciones:</span>
            <button onClick={() => navigateToPoint(1)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeWaypoint === 1 ? 'bg-[#0058C6] text-white shadow-md' : 'bg-[#1B1F26] text-[#EEF0F2] hover:bg-[#21262E]'}`}><Radio className="w-3.5 h-3.5" />Punto 01: Entrada</button>
            <button onClick={() => navigateToPoint(2)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeWaypoint === 2 ? 'bg-[#0058C6] text-white shadow-md' : 'bg-[#1B1F26] text-[#EEF0F2] hover:bg-[#21262E]'}`}><Cpu className="w-3.5 h-3.5" />Punto 02: Sensor IoT</button>
            <button onClick={() => navigateToPoint(3)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeWaypoint === 3 ? 'bg-[#0058C6] text-white shadow-md' : 'bg-[#1B1F26] text-[#EEF0F2] hover:bg-[#21262E]'}`}><Activity className="w-3.5 h-3.5" />Punto 03: Dashboard ML</button>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 bg-[#14171C]/95 backdrop-blur-md px-3 sm:px-4 py-2 rounded-xl border border-white/10 shadow-xl text-xs font-mono">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E2604F]"></span><span className="text-[#8B93A1]">TEMP:</span><span className="font-bold text-[#E2604F]">{sensorData.temperature.toFixed(1)}°C</span></div>
            <div className="flex items-center gap-1.5 hidden sm:flex"><span className="w-2 h-2 rounded-full bg-[#3AA8A0]"></span><span className="text-[#8B93A1]">PRES:</span><span className="font-bold text-[#3AA8A0]">{sensorData.pressure.toFixed(1)} hPa</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#6B7FD6]"></span><span className="text-[#8B93A1]">VIB:</span><span className={`font-bold ${sensorData.anomalySimulated ? 'text-[#E2493D]' : 'text-[#EEF0F2]'}`}>{sensorData.vibration.toFixed(2)} mm/s</span></div>
            <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${sensorData.anomalySimulated ? 'bg-[#E2493D]' : 'bg-[#22C55E]'}`}></span><span className={sensorData.anomalySimulated ? 'text-[#E2493D] font-bold' : 'text-[#22C55E]'}>{sensorData.anomalySimulated ? 'ALERTA' : 'ESTABLE'}</span></div>
            <button onClick={toggleAnomalyMode} className={`px-2.5 py-1 rounded text-[11px] font-sans font-semibold border transition cursor-pointer ${sensorData.anomalySimulated ? 'bg-[#22C55E] text-[#0C0E11] border-[#22C55E]' : 'bg-[#2C323B] hover:bg-[#3A4048] text-[#EEF0F2] border-white/10'}`}>{sensorData.anomalySimulated ? 'Restablecer' : 'Simular Alerta'}</button>
          </div>
        </div>
      </div>

      {/* WELCOME & AUDIO UNLOCK MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[999999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto">
          <div className="bg-[#14171C] border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-[#EEF0F2]">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
              <img src="/logo-sensortech.svg" alt="SensorTech" className="w-16 h-16 object-contain" />
              <div>
                <h2 className="text-xl font-bold text-[#EEF0F2]">PLANTA DE INYECCIÓN SENSORTECH</h2>
                <p className="text-xs text-[#00E5FF] font-mono font-semibold">ENTORNO VIRTUAL 3D // INDUSTRIA 4.0</p>
              </div>
            </div>
            <p className="text-sm text-[#8B93A1] mb-4 leading-relaxed">Pantallas de telemetría y Machine Learning activas con respuesta inmediata a los botones, palanca para conducir el puente grúa de 10T y palanca de purga con vapor para mandos de Meta Quest 3.</p>
            <div className="bg-[#1B1F26] rounded-xl p-3.5 mb-5 border border-white/10">
              <div className="text-xs font-semibold text-[#EEF0F2] mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />Interacciones en Pantallas y Mandos:</div>
              <ul className="text-xs text-[#8B93A1] space-y-1.5">
                <li className="flex items-start gap-2"><span className="font-mono text-[#00E5FF] font-bold">&bull; Diagnóstico AI:</span><span>Presiona [DIAGNÓSTICO AI] en la gran pantalla para iniciar el escaneo predictivo LSTM.</span></li>
                <li className="flex items-start gap-2"><span className="font-mono text-[#E2493D] font-bold">&bull; Simular Anomalía:</span><span>Presiona [SIMULAR ANOMALÍA] para provocar alertas críticas en rojo y picos de vibración.</span></li>
                <li className="flex items-start gap-2"><span className="font-mono text-[#22C55E] font-bold">&bull; Restablecer / Calibrar:</span><span>Presiona [RESTABLECER] o [CALIBRAR] para normalizar todos los sensores.</span></li>
                <li className="flex items-start gap-2"><span className="font-mono text-[#FFC107] font-bold">&bull; Palanca de Grúa:</span><span>Jala la palanca en el pedestal central para mover el Puente Grúa sobre tu cabeza.</span></li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={handleStartExperience} className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#0058C6] to-[#0A3B7A] hover:brightness-110 border border-white/20 text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] cursor-pointer">
                <Play className="w-4 h-4 fill-current text-white" />EMPEZAR RECORRIDO Y ACTIVAR AUDIO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A-FRAME 3D SCENE CON DOM-OVERLAY ACTIVADO PARA MANTENER LA UI EN VR */}
      <a-scene
        webxr="optionalFeatures: dom-overlay; overlayElement: #dom-overlay-container"
        embedded
        renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
        vr-mode-ui="enabled: true"
        raycaster="far: 100; objects: .clickable"
        cursor="rayOrigin: mouse"
      >
        <a-assets timeout="10000">
          <img id="sensortech-logo" src="/logo-sensortech.svg" alt="SensorTech" />
        </a-assets>

        <a-light type="ambient" color="#FFFFFF" intensity="0.8"></a-light>
        <a-light type="directional" color="#FFFFFF" intensity="0.85" position="5 15 5"></a-light>
        <a-light type="point" color="#00D2FF" intensity="0.9" distance="22" position="0 6 0"></a-light>
        <a-light type="point" color="#FFFFFF" intensity="0.7" distance="18" position="0 7 -8"></a-light>

        <a-sky color="#B0C4DE"></a-sky>

        <a-entity id="rig" position="0 0 11">
          <a-camera id="camera" position="0 1.6 0" look-controls="pointerLockEnabled: false" wasd-controls="acceleration: 25">
            <a-cursor
              id="desktop-cursor"
              color="#00E5FF"
              opacity="0.85"
              raycaster="objects: .clickable"
              cursor="fuse: false"
              material="shader: flat"
              position="0 0 -1"
              geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.018"
            ></a-cursor>
          </a-camera>

          <a-entity
            id="leftHand"
            oculus-touch-controls="hand: left; model: true"
            laser-controls="hand: left"
            raycaster="objects: .clickable; showLine: true; far: 14; lineColor: #00E5FF; lineOpacity: 0.9"
            quest-controller-interaction="hand: left"
          ></a-entity>

          <a-entity
            id="rightHand"
            oculus-touch-controls="hand: right; model: true"
            laser-controls="hand: right"
            raycaster="objects: .clickable; showLine: true; far: 14; lineColor: #00E5FF; lineOpacity: 0.9"
            quest-controller-interaction="hand: right"
          ></a-entity>
        </a-entity>

        <a-entity id="virtual-guide-entity" position="2.2 1.6 7.2" virtual-guide>
          <a-text value="GUIA IA SENSORTECH" align="center" position="0 0.95 0" color="#00E5FF" width="4.5" font="monoid"></a-text>
          <a-entity class="guide-core" position="0 0 0">
            <a-sphere radius="0.4" color="#2C3440" metalness="0.8" roughness="0.25"></a-sphere>
            <a-cylinder position="0 0 0.32" rotation="90 0 0" radius="0.28" height="0.12" color="#1B1F26"></a-cylinder>
            <a-entity position="0 0 0.4">
              <a-sphere position="-0.1 0.04 0" scale="0.04 0.08 0.02" color="#FFFFFF" material="emissive: #FFFFFF; emissiveIntensity: 1.0"></a-sphere>
              <a-sphere position="0.1 0.04 0" scale="0.04 0.08 0.02" color="#FFFFFF" material="emissive: #FFFFFF; emissiveIntensity: 1.0"></a-sphere>
            </a-entity>
            <a-cylinder position="-0.12 0.42 0" radius="0.015" height="0.1" color="#00E5FF"></a-cylinder>
            <a-sphere position="-0.12 0.48 0" radius="0.03" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.9"></a-sphere>
            <a-cylinder position="0.12 0.42 0" radius="0.015" height="0.1" color="#00E5FF"></a-cylinder>
            <a-sphere position="0.12 0.48 0" radius="0.03" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.9"></a-sphere>
            <a-image src="#sensortech-logo" position="0 0 -0.41" rotation="0 180 0" width="0.35" height="0.35"></a-image>
          </a-entity>
          <a-torus class="guide-ring-1" radius="0.58" radius-tubular="0.018" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.85; metalness: 0.9" rotation="0 0 0"></a-torus>
          <a-torus class="guide-ring-2" radius="0.68" radius-tubular="0.016" color="#00B0FF" material="emissive: #00B0FF; emissiveIntensity: 0.8; metalness: 0.9" rotation="60 30 0"></a-torus>
          <a-torus class="guide-ring-3" radius="0.78" radius-tubular="0.014" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.75; metalness: 0.9" rotation="120 70 0"></a-torus>
        </a-entity>

        <a-plane position="0 0 0" rotation="-90 0 0" width="26" height="38" color="#4A5568" material="roughness: 0.4; metalness: 0.15"></a-plane>
        <a-plane position="0 0.01 0" rotation="-90 0 0" width="4.8" height="38" color="#0058C6" material="roughness: 0.25; metalness: 0.2"></a-plane>
        <a-plane position="-2.4 0.015 0" rotation="-90 0 0" width="0.14" height="38" color="#FFC107"></a-plane>
        <a-plane position="2.4 0.015 0" rotation="-90 0 0" width="0.14" height="38" color="#FFC107"></a-plane>

        {[-0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6].map((offset, i) => (
          <a-plane key={`zebra-${i}`} position={`0 0.02 ${11.5 - offset}`} rotation="-90 0 0" width="3.6" height="0.22" color="#FFFFFF" material="opacity: 0.95"></a-plane>
        ))}

        <a-box position="-13 5 0" width="0.5" height="10" depth="38" color="#E8ECEF"></a-box>
        <a-box position="13 5 0" width="0.5" height="10" depth="38" color="#E8ECEF"></a-box>
        <a-box position="0 5 -19" width="26.5" height="10" depth="0.5" color="#E8ECEF"></a-box>
        <a-box position="-8 5 19" width="10" height="10" depth="0.5" color="#E8ECEF"></a-box>
        <a-box position="8 5 19" width="10" height="10" depth="0.5" color="#E8ECEF"></a-box>
        <a-box position="0 8.5 19" width="6" height="3" depth="0.5" color="#E8ECEF"></a-box>

        <a-box position="-3.0 3.5 18.8" width="0.4" height="7" depth="0.6" color="#0A2540"></a-box>
        <a-box position="3.0 3.5 18.8" width="0.4" height="7" depth="0.6" color="#0A2540"></a-box>
        <a-box position="0 7 18.8" width="6.4" height="0.4" depth="0.6" color="#0A2540"></a-box>

        <a-plane position="-2.2 3.5 18.9" width="1.4" height="6.6" color="#00D2FF" material="transparent: true; opacity: 0.35; side: double"></a-plane>
        <a-plane position="2.2 3.5 18.9" width="1.4" height="6.6" color="#00D2FF" material="transparent: true; opacity: 0.35; side: double"></a-plane>

        <a-plane position="0 0.005 24" rotation="-90 0 0" width="26" height="10" color="#CBD5E1"></a-plane>
        <a-plane position="-8 0.01 24" rotation="-90 0 0" width="8" height="10" color="#2E7D32"></a-plane>
        <a-plane position="8 0.01 24" rotation="-90 0 0" width="8" height="10" color="#2E7D32"></a-plane>
        <a-plane position="0 0.015 24" rotation="-90 0 0" width="4.8" height="10" color="#0058C6"></a-plane>

        {[-14, -8, -2, 4, 10, 16].map((z, idx) => (
          <React.Fragment key={`roof-truss-${idx}`}>
            <a-box position={`-12.7 4.5 ${z}`} width="0.7" height="9" depth="0.7" color="#DFE3E8"></a-box>
            <a-box position={`12.7 4.5 ${z}`} width="0.7" height="9" depth="0.7" color="#DFE3E8"></a-box>
            <a-box position={`0 8.8 ${z}`} width="26" height="0.4" depth="0.4" color="#0A3B7A"></a-box>
            <a-box position={`-6.5 8.2 ${z}`} rotation="0 0 12" width="13.2" height="0.18" depth="0.18" color="#0052B4"></a-box>
            <a-box position={`6.5 8.2 ${z}`} rotation="0 0 -12" width="13.2" height="0.18" depth="0.18" color="#0052B4"></a-box>
            <a-cylinder position={`-4 7.8 ${z}`} radius="0.32" height="0.22" color="#94A3B8"></a-cylinder>
            <a-sphere position={`-4 7.6 ${z}`} radius="0.16" color="#FFFFFF" material="emissive: #FFFFFF; emissiveIntensity: 1.0"></a-sphere>
            <a-cylinder position={`4 7.8 ${z}`} radius="0.32" height="0.22" color="#94A3B8"></a-cylinder>
            <a-sphere position={`4 7.6 ${z}`} radius="0.16" color="#FFFFFF" material="emissive: #FFFFFF; emissiveIntensity: 1.0"></a-sphere>
          </React.Fragment>
        ))}

        <a-plane position="0 9.2 0" rotation="90 0 0" width="26" height="38" color="#DFE3E8"></a-plane>

        <a-entity id="overhead-crane" position="0 7.8 1">
          <a-box position="0 0 0" width="25" height="0.75" depth="1.1" color="#F5A623"></a-box>
          <a-text value="PUENTE GRUA 10 TON SENSORTECH" align="center" position="0 0 0.58" color="#0A2540" width="12" font="monoid"></a-text>
          <a-text value="PUENTE GRUA 10 TON SENSORTECH" align="center" position="0 0 -0.58" rotation="0 180 0" color="#0A2540" width="12" font="monoid"></a-text>

          <a-entity id="crane-trolley" position="-1.5 -0.5 0">
            <a-box position="0 0 0" width="1.8" height="0.5" depth="1.2" color="#D32F2F"></a-box>
            <a-cylinder position="-0.3 -0.9 0" radius="0.03" height="1.6" color="#CBD5E1"></a-cylinder>
            <a-cylinder position="0.3 -0.9 0" radius="0.03" height="1.6" color="#CBD5E1"></a-cylinder>
            <a-box position="0 -1.8 0" width="0.5" height="0.4" depth="0.4" color="#1E293B"></a-box>
            <a-torus position="0 -2.1 0" radius="0.18" radius-tubular="0.04" color="#94A3B8" arc="270"></a-torus>
          </a-entity>
        </a-entity>

        <a-entity id="crane-control-station" position="2.0 0 6.5" rotation="0 -70 0">
          <a-box position="0 0.5 0" width="0.6" height="1.0" depth="0.5" color="#1E293B"></a-box>
          <a-box position="0 0.98 0" width="0.66" height="0.1" depth="0.56" color="#FFC107"></a-box>
          <a-text value="PUENTE GRUA 10T" align="center" position="0 0.7 0.27" color="#FFC107" width="1.8" font="monoid"></a-text>
          <a-text value="JALAR PARA MOVER" align="center" position="0 0.55 0.27" color="#FFFFFF" width="1.4" font="monoid"></a-text>

          <a-entity id="crane-throttle-lever" class="clickable crane-control-lever" position="0 1.05 0" crane-control-lever>
            <a-box class="clickable crane-hitbox" position="0 0.3 0" width="0.9" height="1.0" depth="0.9" material="opacity: 0; transparent: true"></a-box>
            <a-box position="0 0 0" width="0.22" height="0.08" depth="0.28" color="#0F172A"></a-box>
            <a-entity class="crane-lever-handle" position="0 0 0" rotation="-30 0 0">
              <a-cylinder class="clickable" position="0 0.2 0" radius="0.025" height="0.4" color="#E2E8F0" material="metalness: 0.9"></a-cylinder>
              <a-sphere class="clickable" position="0 0.42 0" radius="0.065" color="#E2493D" material="metalness: 0.3; roughness: 0.3"></a-sphere>
            </a-entity>
          </a-entity>
        </a-entity>

        <a-entity id="waypoint-1" position="0 0.02 10" floor-waypoint="pointId: 1; targetX: 0; targetZ: 10; guideX: 2.2; guideZ: 7.2" class="clickable">
          <a-ring radius-inner="1.0" radius-outer="1.18" rotation="-90 0 0" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.9"></a-ring>
          <a-circle radius="0.95" rotation="-90 0 0" color="#0058C6" material="opacity: 0.9"></a-circle>
          <a-text value="PUNTO 01 ENTRADA PLANTA 4.0" align="center" position="0 0.03 0.1" rotation="-90 0 0" color="#FFFFFF" width="4.8" font="monoid"></a-text>
        </a-entity>

        <a-entity id="waypoint-2" position="-2.8 0.02 3" floor-waypoint="pointId: 2; targetX: -2.8; targetZ: 3.0; guideX: -0.6; guideZ: 1.2" class="clickable">
          <a-ring radius-inner="0.9" radius-outer="1.08" rotation="-90 0 0" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.9"></a-ring>
          <a-circle radius="0.85" rotation="-90 0 0" color="#0058C6" material="opacity: 0.9"></a-circle>
          <a-text value="PUNTO 02 SENSOR IOT ESP32 + BME280" align="center" position="0 0.03 0.1" rotation="-90 0 0" color="#FFFFFF" width="4.2" font="monoid"></a-text>
        </a-entity>

        <a-entity id="waypoint-3" position="0 0.02 -7" floor-waypoint="pointId: 3; targetX: 0; targetZ: -7.5; guideX: 2.5; guideZ: -9.5" class="clickable">
          <a-ring radius-inner="1.2" radius-outer="1.4" rotation="-90 0 0" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.9"></a-ring>
          <a-circle radius="1.15" rotation="-90 0 0" color="#0058C6" material="opacity: 0.9"></a-circle>
          <a-text value="PUNTO 03 DASHBOARD MACHINE LEARNING" align="center" position="0 0.03 0.1" rotation="-90 0 0" color="#FFFFFF" width="5.0" font="monoid"></a-text>
        </a-entity>

        <a-entity id="iot-kiosk-station" position="-2.6 0 2.2" rotation="0 45 0">
          <a-cylinder position="0 0.05 0" radius="0.6" height="0.1" color="#14171C"></a-cylinder>
          <a-cylinder position="0 0.7 0" radius="0.1" height="1.2" color="#21262E"></a-cylinder>

          <a-entity position="0 1.35 0" rotation="-22 0 0">
            <a-box position="0 0 -0.04" width="1.6" height="1.15" depth="0.08" color="#14171C"></a-box>
            <a-box position="0 0 -0.06" width="1.66" height="1.21" depth="0.02" color="#3AA8A0"></a-box>

            <a-plane id="iotScreenMesh" position="0 0 0.02" width="1.5" height="1.05" dynamic-screen="canvasId: iotCanvasEl"></a-plane>

            <a-entity position="0 -0.42 0.04">
              <a-box position="-0.48 0 0" width="0.38" height="0.12" depth="0.04" color="#262B33" class="clickable touch-screen-btn" touch-screen-button="action: test-alert; label: TEST ALERTA">
                <a-text value="TEST ALERTA" align="center" position="0 0 0.03" color="#EEF0F2" width="1.8" font="monoid" class="clickable"></a-text>
              </a-box>
              <a-box position="0 0 0" width="0.38" height="0.12" depth="0.04" color="#262B33" class="clickable touch-screen-btn" touch-screen-button="action: calibrate; label: CALIBRAR">
                <a-text value="CALIBRAR" align="center" position="0 0 0.03" color="#3AA8A0" width="1.8" font="monoid" class="clickable"></a-text>
              </a-box>
              <a-box position="0.48 0 0" width="0.38" height="0.12" depth="0.04" color="#262B33" class="clickable touch-screen-btn" touch-screen-button="action: purge; label: PURGAR">
                <a-text value="PURGAR" align="center" position="0 0 0.03" color="#E2604F" width="1.8" font="monoid" class="clickable"></a-text>
              </a-box>
            </a-entity>
          </a-entity>

          <a-entity position="0.35 0.85 0" rotation="0 -30 0">
            <a-box position="0 0 0" width="0.26" height="0.22" depth="0.1" color="#1B1F26"></a-box>
            <a-sphere position="0.08 0.06 0.06" radius="0.02" color={sensorData.anomalySimulated ? '#E2493D' : '#8BD346'} material="emissive: #8BD346; emissiveIntensity: 1"></a-sphere>
            <a-cylinder position="0.08 0.16 0" radius="0.008" height="0.12" color="#14171C"></a-cylinder>
            <a-text value="ESP32 IoT" align="center" position="0 0 0.06" color="#3AA8A0" width="1.2" font="monoid"></a-text>
          </a-entity>
        </a-entity>

        <a-entity id="ml-stage" position="0 0 -13">
          <a-box position="0 0.15 0" width="13" height="0.3" depth="6" color="#14171C"></a-box>
          <a-box position="0 0.3 2.95" width="13" height="0.04" depth="0.1" color="#00E5FF"></a-box>

          <a-box position="0 2.9 -2.2" width="9.6" height="4.8" depth="0.2" color="#14171C"></a-box>
          <a-box position="0 2.9 -2.25" width="9.8" height="5.0" depth="0.05" color="#21262E"></a-box>

          <a-plane id="mainDashboardMesh" position="0 2.9 -2.08" width="9.2" height="4.4" dynamic-screen="canvasId: dashCanvasEl"></a-plane>

          <a-entity position="0 0.5 -1.7">
            <a-box position="-2.4 0 0" width="1.8" height="0.3" depth="0.1" color="#262B33" class="clickable touch-screen-btn" touch-screen-button="action: diagnostic; label: DIAGNOSTICO AI">
              <a-text value="DIAGNOSTICO AI" align="center" position="0 0 0.06" color="#00E5FF" width="4" font="monoid" class="clickable"></a-text>
            </a-box>
            <a-box position="0 0 0" width="1.8" height="0.3" depth="0.1" color="#262B33" class="clickable touch-screen-btn" touch-screen-button="action: test-alert; label: SIMULAR ANOMALIA">
              <a-text value={sensorData.anomalySimulated ? 'RESTABLECER' : 'SIMULAR ANOMALIA'} align="center" position="0 0 0.06" color={sensorData.anomalySimulated ? '#22C55E' : '#E2493D'} width="4" font="monoid" class="clickable"></a-text>
            </a-box>
            <a-box position="2.4 0 0" width="1.8" height="0.3" depth="0.1" color="#262B33" class="clickable touch-screen-btn" touch-screen-button="action: calibrate; label: RESET SENSORES">
              <a-text value="RESET SENSORES" align="center" position="0 0 0.06" color="#EEF0F2" width="4" font="monoid" class="clickable"></a-text>
            </a-box>
          </a-entity>

          <a-entity position="-5.4 1.6 -1.2">
            <a-box position="0 0 0" width="1.2" height="2.8" depth="1.0" color="#14171C"></a-box>
            <a-box position="0 0 0.51" width="1.05" height="2.65" depth="0.02" color="#1B1F26"></a-box>
            <a-text value="SERVIDOR ML #01" align="center" position="0 1.15 0.53" color="#3AA8A0" width="3.2" font="monoid"></a-text>
            <a-text value="CLUSTER GPU/IOT" align="center" position="0 0.95 0.53" color="#8B93A1" width="2.4" font="monoid"></a-text>
            {[-0.6, -0.2, 0.2, 0.6].map((ly, lidx) => (
              <React.Fragment key={`rack1-led-${lidx}`}>
                <a-sphere position={`-0.35 ${ly} 0.53`} radius="0.025" color="#8BD346" material="emissive: #8BD346; emissiveIntensity: 1"></a-sphere>
                <a-sphere position={`-0.25 ${ly} 0.53`} radius="0.025" color="#3AA8A0" material="emissive: #3AA8A0; emissiveIntensity: 1"></a-sphere>
                <a-sphere position={`-0.15 ${ly} 0.53`} radius="0.025" color="#6B7FD6" material="emissive: #6B7FD6; emissiveIntensity: 1"></a-sphere>
                <a-box position={`0.2 ${ly} 0.53`} width="0.45" height="0.1" depth="0.02" color="#21262E"></a-box>
              </React.Fragment>
            ))}
          </a-entity>

          <a-entity position="5.4 1.6 -1.2">
            <a-box position="0 0 0" width="1.2" height="2.8" depth="1.0" color="#14171C"></a-box>
            <a-box position="0 0 0.51" width="1.05" height="2.65" depth="0.02" color="#1B1F26"></a-box>
            <a-text value="SERVIDOR ML #02" align="center" position="0 1.15 0.53" color="#3AA8A0" width="3.2" font="monoid"></a-text>
            <a-text value="BROKER MQTT/TLS" align="center" position="0 0.95 0.53" color="#8B93A1" width="2.4" font="monoid"></a-text>
            {[-0.6, -0.2, 0.2, 0.6].map((ly, lidx) => (
              <React.Fragment key={`rack2-led-${lidx}`}>
                <a-sphere position={`0.35 ${ly} 0.53`} radius="0.025" color="#8BD346" material="emissive: #8BD346; emissiveIntensity: 1"></a-sphere>
                <a-sphere position={`0.25 ${ly} 0.53`} radius="0.025" color="#F0A93A" material="emissive: #F0A93A; emissiveIntensity: 1"></a-sphere>
                <a-sphere position={`0.15 ${ly} 0.53`} radius="0.025" color="#3AA8A0" material="emissive: #3AA8A0; emissiveIntensity: 1"></a-sphere>
                <a-box position={`-0.2 ${ly} 0.53`} width="0.45" height="0.1" depth="0.02" color="#21262E"></a-box>
              </React.Fragment>
            ))}
          </a-entity>
        </a-entity>

        <a-entity position="-12.7 5.5 0" rotation="0 90 0">
          <a-box position="0 0 -0.05" width="7" height="3" depth="0.1" color="#14171C"></a-box>
          <a-box position="0 0 -0.07" width="7.2" height="3.2" depth="0.05" color="#3AA8A0"></a-box>
          <a-image src="#sensortech-logo" position="-2.3 0 0.05" width="2" height="2"></a-image>
          <a-text value="SENSORTECH 4.0" position="-0.8 0.6 0.05" color="#EEF0F2" width="7" font="monoid"></a-text>
          <a-text value="MANTENIMIENTO PREDICTIVO // IA" position="-0.8 0.1 0.05" color="#3AA8A0" width="5.5" font="monoid"></a-text>
          <a-text value="Telemetria ESP32 + Redes Neuronales LSTM" position="-0.8 -0.4 0.05" color="#8B93A1" width="4.5" font="monoid"></a-text>
        </a-entity>
        <a-entity position="12.7 5.5 0" rotation="0 -90 0">
          <a-box position="0 0 -0.05" width="7" height="3" depth="0.1" color="#14171C"></a-box>
          <a-box position="0 0 -0.07" width="7.2" height="3.2" depth="0.05" color="#E2604F"></a-box>
          <a-image src="#sensortech-logo" position="2.3 0 0.05" width="2" height="2"></a-image>
          <a-text value="ZERO DOWNTIME" position="-2.8 0.6 0.05" color="#EEF0F2" width="7" font="monoid"></a-text>
          <a-text value="EFICIENCIA OEE SUPERIOR AL 92%" position="-2.8 0.1 0.05" color="#E2604F" width="5.5" font="monoid"></a-text>
          <a-text value="Deteccion de fatiga en rodamientos y desalineacion" position="-2.8 -0.4 0.05" color="#8B93A1" width="4.5" font="monoid"></a-text>
        </a-entity>

        {[
          { id: 'INX-01', x: -6.5, z: 9, rot: 90, name: 'INX-01 ENGEL 200T' },
          { id: 'INX-02', x: -6.5, z: 3, rot: 90, name: 'INX-02 ARBURG 370' },
          { id: 'INX-03', x: -6.5, z: -3, rot: 90, name: 'INX-03 KRAUSS 150T' },
          { id: 'INX-04', x: 6.5, z: 9, rot: -90, name: 'INX-04 HAITIAN 160T' },
          { id: 'INX-05', x: 6.5, z: 3, rot: -90, name: 'INX-05 ENGEL 180T' },
          { id: 'INX-06', x: 6.5, z: -3, rot: -90, name: 'INX-06 ARBURG 320' },
        ].map(m => (
          <a-entity key={m.id} id={`machine-${m.id}`} class="machine-unit" position={`${m.x} 0 ${m.z}`} rotation={`0 ${m.rot} 0`}>
            <a-box position="0 0.5 0" width="5.2" height="1.0" depth="1.8" color="#0B2046"></a-box>
            <a-box position="0 0.88 0" width="5.0" height="0.12" depth="1.7" color="#EAEDF1"></a-box>
            <a-box position="-1.5 1.5 0" width="0.4" height="1.2" depth="1.5" color="#0B2046"></a-box>
            <a-box position="-0.4 1.5 0" width="0.4" height="1.1" depth="1.4" color="#CBD5E1"></a-box>
            <a-cylinder position="-1.0 1.9 0.55" rotation="0 0 90" radius="0.05" height="1.8" color="#94A3B8"></a-cylinder>
            <a-cylinder position="-1.0 1.9 -0.55" rotation="0 0 90" radius="0.05" height="1.8" color="#94A3B8"></a-cylinder>
            <a-cylinder position="-1.0 1.1 0.55" rotation="0 0 90" radius="0.05" height="1.8" color="#94A3B8"></a-cylinder>
            <a-cylinder position="-1.0 1.1 -0.55" rotation="0 0 90" radius="0.05" height="1.8" color="#94A3B8"></a-cylinder>
            <a-box position="-1.9 1.5 0" width="0.5" height="0.6" depth="0.6" color="#C62828"></a-box>
            <a-entity class="injection-piston" position="0 1.5 0">
              <a-cylinder position="1.1 0 0" rotation="0 0 90" radius="0.22" height="2.2" color="#EAEDF1"></a-cylinder>
              {[0.4, 0.8, 1.2, 1.6].map((hx, hidx) => (
                <a-torus key={`band-${hidx}`} position={`${hx} 0 0`} rotation="0 90 0" radius="0.24" radius-tubular="0.035" color="#E2604F" material="emissive: #E2604F; emissiveIntensity: 0.5"></a-torus>
              ))}
            </a-entity>
            <a-sphere class="steam-purge-cloud" position="0 1.5 0" radius="0.6" color="#FFFFFF" material="transparent: true; opacity: 0; roughness: 0.9" visible="false"></a-sphere>
            <a-cone position="1.5 2.5 0" radius-bottom="0.22" radius-top="0.55" height="0.9" color="#B0BEC5" material="metalness: 0.8; roughness: 0.25"></a-cone>
            <a-cylinder position="1.5 1.9 0" radius="0.12" height="0.4" color="#0B2046"></a-cylinder>
            <a-box position="0.2 1.6 0.95" rotation="-15 0 0" width="0.75" height="0.5" depth="0.1" color="#0B2046"></a-box>
            <a-plane position="0.2 1.61 1.01" rotation="-15 0 0" width="0.65" height="0.4" color="#0C0E11"></a-plane>
            <a-text value={m.id} align="center" position="0.2 1.65 1.03" rotation="-15 0 0" color="#00E5FF" width="1.8" font="monoid"></a-text>

            <a-entity id={`lever-${m.id}`} class="clickable interactive-lever" position="0.9 1.25 0.96" interactive-lever={`machineId: ${m.id}`}>
              <a-box class="clickable lever-hitbox" position="0 0.25 0" width="0.7" height="1.0" depth="0.7" material="opacity: 0; transparent: true"></a-box>
              <a-box position="0 0 -0.04" width="0.18" height="0.24" depth="0.06" color="#1E293B"></a-box>
              <a-text value="PURGA/MANUAL" align="center" position="0 0.16 0" color="#FFC107" width="1.1" font="monoid"></a-text>
              <a-entity class="lever-handle" position="0 0 0" rotation="0 0 0">
                <a-cylinder class="clickable" position="0 0.16 0.05" radius="0.018" height="0.32" color="#E2E8F0" material="metalness: 0.9"></a-cylinder>
                <a-sphere class="clickable" position="0 0.32 0.05" radius="0.045" color="#E2493D" material="roughness: 0.3"></a-sphere>
              </a-entity>
            </a-entity>

            <a-entity position="-2.2 2.1 0.7">
              <a-cylinder position="0 0 0" radius="0.02" height="0.8" color="#94A3B8"></a-cylinder>
              <a-cylinder class="status-beacon-green" position="0 0.45 0" radius="0.06" height="0.1" color="#22C55E" material="emissive: #22C55E; emissiveIntensity: 1.0"></a-cylinder>
              <a-cylinder class="status-beacon-amber" position="0 0.58 0" radius="0.06" height="0.1" color="#14171C" material="emissive: #000; emissiveIntensity: 0"></a-cylinder>
              <a-cylinder position="0 0.71 0" radius="0.06" height="0.1" color="#14171C" material="emissive: #000; emissiveIntensity: 0"></a-cylinder>
            </a-entity>
            <a-box position="0 0.6 1.4" width="4.8" height="0.05" depth="0.05" color="#FFC107"></a-box>
            <a-box position="0 1.0 1.4" width="4.8" height="0.05" depth="0.05" color="#FFC107"></a-box>
            <a-cylinder position="-2.3 0.5 1.4" radius="0.03" height="1.0" color="#FFC107"></a-cylinder>
            <a-cylinder position="2.3 0.5 1.4" radius="0.03" height="1.0" color="#FFC107"></a-cylinder>
          </a-entity>
        ))}

        <a-entity id="audio-listener" sound="src: url(data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=); autoplay: false; loop: true"></a-entity>
      </a-scene>
    </div>
  );
}
