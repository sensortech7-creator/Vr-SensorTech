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
        <a-plane position="-2.4 0.015 0"
