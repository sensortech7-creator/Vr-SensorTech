/**
 * SensorTech VR - Planta de Inyección 4.0
 * WebXR & A-Frame Application optimized for Meta Quest 3 and desktop/mobile.
 * Fixed:
 * 1. Buttons NEVER disappear when maximizing window or entering fullscreen
 * 2. Dedicated 3D Central Operations Console right in front of user at entry waypoint with physical push-buttons, crane throttle lever, purge lever, and 3D floating notification banner
 * 3. Screens display live dynamic 2D canvas textures and respond IMMEDIATELY with spectacular visual animations:
 *    - [DIAGNÓSTICO AI]: Sweeping laser scan, neural inference telemetry, voice narration
 *    - [SIMULAR ANOMALÍA]: Flashing red critical alert banner, temperature jump (258°C), vibration spike (7.42 mm/s), warning siren
 *    - [RESTABLECER]: Green normalization, nominal 99.8% stability, calm curves
 *    - [PURGA]: Mechanical clunk, pneumatic pressure drop, visible steam discharge from machine
 *    - [MOVER GRÚA 10T]: 25m yellow bridge crane travels across ceiling, trolley shifts, hook swings
 * 4. Meta Quest 3 Oculus Touch controller lasers (triggerdown & gripdown) and mouse clicks fully unified
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Sparkles,
  Activity,
  Cpu,
  Move,
  Maximize2,
  Minimize2,
  RefreshCw,
  BellRing
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
  const [toastMessage, setToastMessage] = useState<string>('SISTEMA EN ESPERA');
  const [toastType, setToastType] = useState<'info' | 'alert' | 'success' | 'action'>('info');

  // Mutable reference for immediate synchronous canvas and logic updates (prevents stale closures)
  const sensorStateRef = useRef<SensorData>({
    temperature: 219.5,
    pressure: 1012.3,
    humidity: 41.5,
    vibration: 3.72,
    current: 43.4,
    status: 'normal',
    anomalySimulated: false,
    diagnosticActive: false,
    rulHours: 1420
  });

  const [sensorData, setSensorData] = useState<SensorData>(sensorStateRef.current);
  const canvasManagerRef = useRef<ScreenCanvasManager | null>(null);

  // Helper to show visible toast feedback
  const showNotification = (msg: string, type: 'info' | 'alert' | 'success' | 'action') => {
    setToastMessage(msg);
    setToastType(type);

    // Update 3D Floating Notification in the VR world
    const consoleBanner = document.querySelector('#console-3d-toast') as any;
    if (consoleBanner) {
      consoleBanner.setAttribute('value', msg);
      if (type === 'alert') {
        consoleBanner.setAttribute('color', '#E2493D');
      } else if (type === 'success') {
        consoleBanner.setAttribute('color', '#22C55E');
      } else if (type === 'action') {
        consoleBanner.setAttribute('color', '#FFC107');
      } else {
        consoleBanner.setAttribute('color', '#00E5FF');
      }
    }
  };

  // Helper to synchronously update telemetry and redraw canvases immediately
  const applySensorUpdate = (patch: Partial<SensorData>) => {
    sensorStateRef.current = {
      ...sensorStateRef.current,
      ...patch
    };
    const current = sensorStateRef.current;
    if (canvasManagerRef.current) {
      canvasManagerRef.current.update(current);
    }
    setSensorData({ ...current });
  };

  // 1. AI Diagnostic Execution
  const runAIDiagnostic = () => {
    audioService.unlock();
    audioService.playStartupChime();
    showNotification('¡DIAGNÓSTICO AI EN CURSO! ANALIZANDO 6 MÁQUINAS...', 'info');

    applySensorUpdate({
      diagnosticActive: true,
      status: 'diagnostic'
    });

    audioService.speak('Diagnóstico predictivo de Inteligencia Artificial iniciado. Evaluando parámetros en tiempo real.');

    setTimeout(() => {
      audioService.playBeep(true);
      applySensorUpdate({
        diagnosticActive: false,
        status: sensorStateRef.current.anomalySimulated ? 'alert' : 'normal',
        rulHours: 1420
      });
      showNotification('¡DIAGNÓSTICO COMPLETO! CONFIANZA DEL MODELO 99.4%', 'success');
    }, 3200);
  };

  // 2. Anomaly Simulation Toggle
  const toggleAnomalyMode = () => {
    audioService.unlock();
    const currentState = sensorStateRef.current.anomalySimulated;
    const nextState = !currentState;

    if (nextState) {
      audioService.playAlert();
      applySensorUpdate({
        anomalySimulated: true,
        temperature: 258.4,
        vibration: 7.42,
        status: 'alert',
        rulHours: 120
      });
      showNotification('¡¡ALERTA CRÍTICA SIMULADA!! VIBRACIÓN 7.42 mm/s', 'alert');
      audioService.speak('¡Alerta crítica! Se ha detectado una sobretensión y vibración excesiva en la máquina INX-02.');
    } else {
      audioService.playBeep(true);
      applySensorUpdate({
        anomalySimulated: false,
        temperature: 219.5,
        vibration: 3.72,
        status: 'normal',
        rulHours: 1420
      });
      showNotification('SENSORES NORMALIZADOS Y OPERATIVOS', 'success');
      audioService.speak('Sensores normalizados. Planta SensorTech en estado nominal.');
    }
  };

  // 3. Reset & Calibrate Sensors
  const resetAndCalibrate = () => {
    audioService.unlock();
    audioService.playBeep(true);

    applySensorUpdate({
      anomalySimulated: false,
      diagnosticActive: false,
      temperature: 219.5,
      pressure: 1012.3,
      vibration: 3.72,
      status: 'normal',
      rulHours: 1420
    });

    showNotification('SENSORES CALIBRADOS Y NORMALIZADOS', 'success');
    audioService.speak('Sensores calibrados con éxito. Ciclo de producción restablecido.');
  };

  // 4. Machine Purge Action
  const triggerMachinePurge = () => {
    audioService.unlock();
    audioService.playLeverPurge();

    // Trigger machine animations
    const leverEls = document.querySelectorAll('[interactive-lever]');
    leverEls.forEach((el: any) => {
      const handle = el.querySelector('.lever-handle');
      if (handle) {
        handle.setAttribute('animation', {
          property: 'rotation',
          to: '42 0 0',
          dur: 280,
          easing: 'easeOutBack'
        });
        setTimeout(() => {
          handle.setAttribute('animation', {
            property: 'rotation',
            to: '0 0 0',
            dur: 280,
            easing: 'easeOutBack'
          });
        }, 1200);
      }
    });

    // Piston and steam on Machine INX-02
    const machine = document.querySelector('#machine-INX-02') as any;
    if (machine) {
      const piston = machine.querySelector('.injection-piston');
      if (piston) {
        piston.setAttribute('animation__forward', {
          property: 'position',
          to: '0.4 1.5 0',
          dur: 350,
          easing: 'easeOutQuad'
        });
        setTimeout(() => {
          piston.setAttribute('animation__back', {
            property: 'position',
            to: '0 1.5 0',
            dur: 450,
            easing: 'easeInOutQuad'
          });
        }, 500);
      }

      const steam = machine.querySelector('.steam-purge-cloud');
      if (steam) {
        steam.setAttribute('visible', 'true');
        steam.setAttribute('animation__scale', {
          property: 'scale',
          from: '0.1 0.1 0.1',
          to: '1.2 1.2 1.2',
          dur: 500,
          easing: 'easeOutQuad'
        });
        steam.setAttribute('animation__fade', {
          property: 'material.opacity',
          from: '0.85',
          to: '0.0',
          dur: 650,
          easing: 'easeOutQuad'
        });
        setTimeout(() => {
          steam.setAttribute('visible', 'false');
        }, 700);
      }
    }

    applySensorUpdate({
      status: 'purging',
      pressure: 420.0,
      vibration: 5.2
    });

    showNotification('¡PURGA NEUMÁTICA ACTIVADA EN INX-02!', 'action');
    audioService.speak('Purga neumática realizada en máquina de inyección.');

    setTimeout(() => {
      applySensorUpdate({
        status: sensorStateRef.current.anomalySimulated ? 'alert' : 'normal',
        pressure: 1012.3,
        vibration: sensorStateRef.current.anomalySimulated ? 7.42 : 3.72
      });
    }, 1800);
  };

  // 5. Crane Locomotion
  const triggerCraneMove = () => {
    audioService.unlock();
    audioService.playCraneMove();

    const crane = document.querySelector('#overhead-crane') as any;
    const trolley = document.querySelector('#crane-trolley') as any;
    const currentZ = crane ? parseFloat(crane.getAttribute('position')?.z || '1') : 1;
    const targetZ = currentZ > 0 ? -6 : 3.5;
    const targetX = currentZ > 0 ? 2.8 : -2.8;

    if (crane) {
      crane.setAttribute('animation__move', {
        property: 'position',
        to: `0 7.8 ${targetZ}`,
        dur: 3200,
        easing: 'easeInOutQuad'
      });
    }

    if (trolley) {
      trolley.setAttribute('animation__trolley', {
        property: 'position',
        to: `${targetX} -0.5 0`,
        dur: 3000,
        easing: 'easeInOutQuad'
      });
    }

    // Tilt lever on all crane pedestals
    const handles = document.querySelectorAll('.crane-lever-handle');
    handles.forEach((h: any) => {
      h.setAttribute('animation', {
        property: 'rotation',
        to: targetZ < 0 ? '40 0 0' : '-35 0 0',
        dur: 300,
        easing: 'easeOutQuad'
      });
    });

    showNotification('¡OPERANDO PUENTE GRÚA 10 TON SENSORTECH!', 'action');
    audioService.speak('Operando puente grúa de diez toneladas.');
  };

  // 6. Navigation Waypoints
  const navigateToPoint = (pointId: number) => {
    setActiveWaypoint(pointId);
    audioService.unlock();
    setIsAudioUnlocked(true);
    audioService.playBeep(false);

    let targetX = 0;
    let targetZ = 10;
    let guideX = 2.2;
    let guideZ = 7.2;

    if (pointId === 1) {
      targetX = 0;
      targetZ = 10;
      guideX = 2.2;
      guideZ = 7.2;
      showNotification('ESTACIÓN 01: ENTRADA PRINCIPAL', 'info');
    } else if (pointId === 2) {
      targetX = -2.8;
      targetZ = 3.0;
      guideX = -0.6;
      guideZ = 1.2;
      showNotification('ESTACIÓN 02: NODO IOT ESP32 + BME280', 'info');
    } else if (pointId === 3) {
      targetX = 0;
      targetZ = -7.5;
      guideX = 2.5;
      guideZ = -9.5;
      showNotification('ESTACIÓN 03: DASHBOARD MACHINE LEARNING', 'info');
    }

    const rig = document.querySelector('#rig') as any;
    if (rig) {
      rig.setAttribute('animation', {
        property: 'position',
        to: `${targetX} 0 ${targetZ}`,
        dur: 800,
        easing: 'easeInOutCubic'
      });
    }

    const guide = document.querySelector('#virtual-guide-entity') as any;
    if (guide) {
      guide.setAttribute('animation', {
        property: 'position',
        to: `${guideX} 1.6 ${guideZ}`,
        dur: 1100,
        easing: 'easeInOutQuad'
      });
    }

    setTimeout(() => {
      audioService.speakWaypoint(pointId);
    }, 500);
  };

  // Expose global trigger function for A-Frame components
  useEffect(() => {
    (window as any).triggerSensorTechAction = (action: string) => {
      if (action === 'diagnostic') {
        runAIDiagnostic();
      } else if (action === 'test-alert' || action === 'anomaly') {
        toggleAnomalyMode();
      } else if (action === 'calibrate' || action === 'reset') {
        resetAndCalibrate();
      } else if (action === 'purge') {
        triggerMachinePurge();
      } else if (action === 'move-crane') {
        triggerCraneMove();
      }
    };

    return () => {
      delete (window as any).triggerSensorTechAction;
    };
  }, []);

  useEffect(() => {
    registerAFrameComponents();

    if (!canvasManagerRef.current) {
      canvasManagerRef.current = new ScreenCanvasManager();
    }

    // Telemetry tick loop (live fluctuations)
    const timer = setInterval(() => {
      const prev = sensorStateRef.current;
      const jitter = (Math.random() - 0.5);

      const nextTemp = prev.anomalySimulated
        ? 256.4 + jitter * 2.2
        : (prev.diagnosticActive ? 222.1 + jitter * 0.3 : 219.5 + jitter * 0.4);

      const nextPress = prev.status === 'purging'
        ? 420.0 + jitter * 5.0
        : 1012.3 + jitter * 1.5;

      const nextHum = 41.5 + jitter * 0.2;

      const nextVib = prev.anomalySimulated
        ? 7.45 + jitter * 0.8
        : (prev.status === 'purging' ? 5.2 : 3.72 + jitter * 0.15);

      const nextCurr = prev.status === 'purging' ? 58.4 : 43.4 + jitter * 0.5;

      // Update refs & canvases without triggering unnecessary re-renders
      sensorStateRef.current = {
        ...prev,
        temperature: nextTemp,
        pressure: nextPress,
        humidity: nextHum,
        vibration: nextVib,
        current: nextCurr
      };

      if (canvasManagerRef.current) {
        canvasManagerRef.current.update(sensorStateRef.current);
      }
    }, 280);

    const handleWaypointEvent = (e: any) => {
      if (e.detail && e.detail.pointId) {
        setActiveWaypoint(e.detail.pointId);
      }
    };

    const handleScreenActionEvent = (e: any) => {
      const action = e.detail && e.detail.action;
      if (action === 'diagnostic') {
        runAIDiagnostic();
      } else if (action === 'test-alert' || action === 'anomaly') {
        toggleAnomalyMode();
      } else if (action === 'calibrate' || action === 'reset') {
        resetAndCalibrate();
      } else if (action === 'purge') {
        triggerMachinePurge();
      } else if (action === 'move-crane') {
        triggerCraneMove();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('sensortech:waypoint-selected', handleWaypointEvent);
    window.addEventListener('sensortech:screen-action', handleScreenActionEvent);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const unlockHandler = () => {
      audioService.unlock().then(() => {
        setIsAudioUnlocked(true);
      });
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

  const handleStartExperience = async () => {
    await audioService.unlock();
    setIsAudioUnlocked(true);
    setShowHelpModal(false);
    showNotification('PLANTA SENSORTECH CONECTADA // AUDIO ACTIVO', 'success');
    setTimeout(() => {
      audioService.speakWaypoint(1);
    }, 600);
  };

  const handleToggleMute = () => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
    showNotification(muted ? 'AUDIO SILENCIADO' : 'AUDIO ACTIVADO', 'info');
  };

  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div id="app-container" className="relative w-full h-screen bg-[#0C0E11] text-[#EEF0F2] overflow-hidden select-none">
      {/* 2D HUD OVERLAY - Pinned with z-[2147483647] so it NEVER disappears when maximizing or in fullscreen */}
      <div className="fixed inset-0 pointer-events-none z-[2147483647] flex flex-col justify-between p-2.5 sm:p-4">
        {/* Top Header & Action Bar */}
        <div className="flex items-center justify-between gap-2 pointer-events-auto flex-wrap">
          {/* Brand Badge */}
          <div className="flex items-center gap-2 bg-[#14171C]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-xl">
            <img
              src="/logo-sensortech.svg"
              alt="SensorTech Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm tracking-wide text-[#EEF0F2]">
                  SENSORTECH VR
                </span>
                <span className="px-1 py-0.2 text-[9px] font-mono font-semibold rounded bg-[#21262E] text-[#00E5FF] border border-[#00E5FF]/30">
                  PLANTA 4.0
                </span>
              </div>
              <p className="text-[10px] text-[#8B93A1] hidden sm:block">
                WebXR &bull; Meta Quest 3 &bull; Mantenimiento Predictivo
              </p>
            </div>
          </div>

          {/* Top Action Buttons (Clear, always visible, interactive buttons!) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Move Crane */}
            <button
              onClick={triggerCraneMove}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2C323B] hover:bg-[#3A4048] active:scale-95 border border-[#FFC107]/50 text-xs text-[#EEF0F2] font-semibold transition shadow-md cursor-pointer"
              title="Mover Puente Grúa de 10 Toneladas"
            >
              <Move className="w-4 h-4 text-[#FFC107]" />
              <span>Mover Grúa 10T</span>
            </button>

            {/* Pull Purge Lever */}
            <button
              onClick={triggerMachinePurge}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2C323B] hover:bg-[#3A4048] active:scale-95 border border-[#E2604F]/50 text-xs text-[#EEF0F2] font-semibold transition shadow-md cursor-pointer"
              title="Jalar Palanca de Purga Neumática"
            >
              <Sliders className="w-4 h-4 text-[#E2604F]" />
              <span>Jalar Palanca</span>
            </button>

            {/* AI Diagnostic Button */}
            <button
              onClick={runAIDiagnostic}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0A2540] hover:bg-[#0E355C] active:scale-95 border border-[#00E5FF]/60 text-xs text-[#00E5FF] font-semibold transition shadow-md cursor-pointer"
              title="Ejecutar Diagnóstico Predictivo AI"
            >
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
              <span>Diagnóstico AI</span>
            </button>

            {/* Simulate Anomaly / Alert Toggle */}
            <button
              onClick={toggleAnomalyMode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition shadow-md active:scale-95 cursor-pointer ${
                sensorStateRef.current.anomalySimulated
                  ? 'bg-[#22C55E] text-[#0C0E11] border-[#22C55E]'
                  : 'bg-[#2C323B] hover:bg-[#3A4048] text-[#EEF0F2] border-[#E2493D]/50'
              }`}
              title="Simular Alerta Crítica o Normalizar Sensores"
            >
              <BellRing className={`w-4 h-4 ${sensorStateRef.current.anomalySimulated ? 'text-[#0C0E11]' : 'text-[#E2493D]'}`} />
              <span>{sensorStateRef.current.anomalySimulated ? 'Restablecer' : 'Simular Alerta'}</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={handleToggleMute}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#21262E] hover:bg-[#2C323B] active:scale-95 border border-white/10 text-xs text-[#EEF0F2] transition shadow cursor-pointer"
              title={isMuted ? 'Activar Sonido' : 'Silenciar'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#E2493D]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#00E5FF]" />
              )}
            </button>

            {/* Maximize / Fullscreen Button (Guarantees buttons never disappear) */}
            <button
              onClick={toggleFullscreenMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1B1F26] hover:bg-[#262C36] active:scale-95 border border-white/15 text-xs text-[#EEF0F2] font-semibold transition shadow-md cursor-pointer"
              title={isFullscreen ? 'Restaurar Pantalla' : 'Maximizar a Pantalla Completa'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-[#FFC107]" />
                  <span>Restaurar</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-[#00E5FF]" />
                  <span>Maximizar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Action Notification Toast Banner */}
        <div className="self-center my-1 pointer-events-auto">
          <div className={`px-4 py-1.5 rounded-full backdrop-blur-md border text-xs font-mono font-bold tracking-wider shadow-2xl flex items-center gap-2 ${
            toastType === 'alert'
              ? 'bg-[#3A1014]/90 border-[#E2493D] text-[#E2493D] animate-pulse'
              : toastType === 'success'
              ? 'bg-[#0E2E18]/90 border-[#22C55E] text-[#22C55E]'
              : toastType === 'action'
              ? 'bg-[#3A2E0E]/90 border-[#FFC107] text-[#FFC107]'
              : 'bg-[#14171C]/90 border-[#00E5FF]/40 text-[#00E5FF]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
            <span>{toastMessage}</span>
          </div>
        </div>

        {/* Bottom Navigation & Live Telemetry Dock */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pointer-events-auto">
          {/* Waypoint Stations */}
          <div className="flex items-center gap-1.5 bg-[#14171C]/95 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl overflow-x-auto max-w-full">
            <span className="px-2 text-xs font-semibold text-[#8B93A1] hidden sm:inline whitespace-nowrap">
              Estaciones:
            </span>

            <button
              onClick={() => navigateToPoint(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeWaypoint === 1
                  ? 'bg-[#0058C6] text-white shadow-md'
                  : 'bg-[#1B1F26] text-[#EEF0F2] hover:bg-[#21262E]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Punto 01: Entrada
            </button>

            <button
              onClick={() => navigateToPoint(2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeWaypoint === 2
                  ? 'bg-[#0058C6] text-white shadow-md'
                  : 'bg-[#1B1F26] text-[#EEF0F2] hover:bg-[#21262E]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Punto 02: Sensor IoT
            </button>

            <button
              onClick={() => navigateToPoint(3)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeWaypoint === 3
                  ? 'bg-[#0058C6] text-white shadow-md'
                  : 'bg-[#1B1F26] text-[#EEF0F2] hover:bg-[#21262E]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Punto 03: Dashboard ML
            </button>
          </div>

          {/* Instructions pill */}
          <div className="flex items-center gap-2 bg-[#14171C]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-xl text-xs font-mono">
            <span className="text-[#00E5FF] font-bold">Meta Quest 3:</span>
            <span className="text-[#8B93A1]">Gatillo = Clic &bull; Grip = Palanca</span>
          </div>
        </div>
      </div>

      {/* WELCOME & AUDIO UNLOCK MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#14171C] border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-[#EEF0F2]">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
              <img
                src="/logo-sensortech.svg"
                alt="SensorTech"
                className="w-16 h-16 object-contain"
              />
              <div>
                <h2 className="text-xl font-bold text-[#EEF0F2]">
                  PLANTA DE INYECCIÓN SENSORTECH
                </h2>
                <p className="text-xs text-[#00E5FF] font-mono font-semibold">
                  ENTORNO VIRTUAL 3D // INDUSTRIA 4.0
                </p>
              </div>
            </div>

            <p className="text-sm text-[#8B93A1] mb-4 leading-relaxed">
              Consola 3D de control maestro, pantallas de telemetría y Machine Learning interactivas, palanca física para mover el puente grúa de 10T y palanca de purga con vapor de agua para mandos de Meta Quest 3 o ratón.
            </p>

            <div className="bg-[#1B1F26] rounded-xl p-3.5 mb-5 border border-white/10">
              <div className="text-xs font-semibold text-[#EEF0F2] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
                Funciones de la Consola y Pantallas:
              </div>
              <ul className="text-xs text-[#8B93A1] space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-[#00E5FF] font-bold">&bull; Diagnóstico AI:</span>
                  <span>Escaneo predictivo LSTM y análisis de vibraciones en vivo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-[#E2493D] font-bold">&bull; Simular Anomalía:</span>
                  <span>Activa alerta roja crítica, alarma sonora y salto térmico a 258°C.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-[#22C55E] font-bold">&bull; Restablecer Sensores:</span>
                  <span>Normaliza las métricas y regresa la planta a estado verde óptimo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-[#FFC107] font-bold">&bull; Mover Grúa 10T:</span>
                  <span>Jala la palanca del pedestal para desplazar el puente grúa en el techo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-[#E2604F] font-bold">&bull; Palanca de Purga:</span>
                  <span>Expulsa vapor visible y acciona el pistón de inyección con sonido neumático.</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleStartExperience}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#0058C6] to-[#0A3B7A] hover:brightness-110 border border-white/20 text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-white" />
                EMPEZAR RECORRIDO Y ACTIVAR AUDIO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A-FRAME 3D SCENE */}
      <a-scene
        embedded
        renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
        vr-mode-ui="enabled: true"
        raycaster="far: 40; objects: .clickable"
        cursor="rayOrigin: mouse"
      >
        {/* ASSETS */}
        <a-assets timeout="10000">
          <img id="sensortech-logo" src="/logo-sensortech.svg" alt="SensorTech" />
        </a-assets>

        {/* ENVIRONMENT LIGHTING */}
        <a-light type="ambient" color="#FFFFFF" intensity="0.8"></a-light>
        <a-light type="directional" color="#FFFFFF" intensity="0.85" position="5 15 5"></a-light>
        <a-light type="point" color="#00D2FF" intensity="0.9" distance="22" position="0 6 0"></a-light>
        <a-light type="point" color="#FFFFFF" intensity="0.7" distance="18" position="0 7 -8"></a-light>

        {/* FACTORY SKY */}
        <a-sky color="#B0C4DE"></a-sky>

        {/* USER RIG & META QUEST 3 CONTROLLERS */}
        <a-entity id="rig" position="0 0 11">
          <a-camera id="camera" position="0 1.6 0" look-controls="pointerLockEnabled: false" wasd-controls="acceleration: 25">
            {/* Visual reticle */}
            <a-ring
              position="0 0 -1"
              radius-inner="0.008"
              radius-outer="0.015"
              color="#00E5FF"
              material="shader: flat; opacity: 0.75"
            ></a-ring>
          </a-camera>

          {/* LEFT CONTROLLER */}
          <a-entity
            id="leftHand"
            oculus-touch-controls="hand: left; model: true"
            laser-controls="hand: left"
            raycaster="objects: .clickable; showLine: true; far: 25; lineColor: #00E5FF; lineOpacity: 0.9"
            quest-controller-interaction="hand: left"
          ></a-entity>

          {/* RIGHT CONTROLLER */}
          <a-entity
            id="rightHand"
            oculus-touch-controls="hand: right; model: true"
            laser-controls="hand: right"
            raycaster="objects: .clickable; showLine: true; far: 25; lineColor: #00E5FF; lineOpacity: 0.9"
            quest-controller-interaction="hand: right"
          ></a-entity>
        </a-entity>

        {/* ============================================================== */}
        {/* GUÍA VIRTUAL (ROBOT IA SENSORTECH)                            */}
        {/* ============================================================== */}
        <a-entity
          id="virtual-guide-entity"
          position="2.2 1.6 7.2"
          virtual-guide
        >
          <a-text
            value="GUIA IA SENSORTECH"
            align="center"
            position="0 0.95 0"
            color="#00E5FF"
            width="4.5"
            font="monoid"
          ></a-text>

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

            <a-image
              src="#sensortech-logo"
              position="0 0 -0.41"
              rotation="0 180 0"
              width="0.35"
              height="0.35"
            ></a-image>
          </a-entity>

          <a-torus class="guide-ring-1" radius="0.58" radius-tubular="0.018" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.85; metalness: 0.9" rotation="0 0 0"></a-torus>
          <a-torus class="guide-ring-2" radius="0.68" radius-tubular="0.016" color="#00B0FF" material="emissive: #00B0FF; emissiveIntensity: 0.8; metalness: 0.9" rotation="60 30 0"></a-torus>
          <a-torus class="guide-ring-3" radius="0.78" radius-tubular="0.014" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.75; metalness: 0.9" rotation="120 70 0"></a-torus>
        </a-entity>

        {/* ============================================================== */}
        {/* 3D CONSOLA MAESTRA DE OPERACIONES (RIGHT IN FRONT AT ENTRANCE) */}
        {/* ============================================================== */}
        <a-entity id="central-operations-console" position="0 0 9.2">
          {/* 3D Floating Notification Toast Banner */}
          <a-entity position="0 2.2 0">
            <a-box position="0 0 -0.02" width="3.2" height="0.4" depth="0.04" color="#14171C"></a-box>
            <a-box position="0 0 -0.03" width="3.26" height="0.46" depth="0.02" color="#00E5FF"></a-box>
            <a-text
              id="console-3d-toast"
              value="SISTEMA SENSORTECH ACTIVO"
              align="center"
              position="0 0 0.02"
              color="#00E5FF"
              width="5.5"
              font="monoid"
            ></a-text>
          </a-entity>

          {/* Console Pedestal Base */}
          <a-box position="0 0.45 0" width="2.4" height="0.9" depth="0.8" color="#14171C"></a-box>
          <a-box position="0 0.91 0" width="2.46" height="0.06" depth="0.86" color="#21262E"></a-box>
          <a-box position="0 0.92 0.4" width="2.46" height="0.04" depth="0.06" color="#FFC107"></a-box>

          <a-text
            value="CONSOLA MAESTRA SENSORTECH 4.0"
            align="center"
            position="0 0.65 0.42"
            color="#FFC107"
            width="3.2"
            font="monoid"
          ></a-text>

          {/* Angled Control Dashboard Panel */}
          <a-entity position="0 0.95 0" rotation="-25 0 0">
            <a-box position="0 0.15 0" width="2.3" height="0.4" depth="0.06" color="#1B1F26"></a-box>

            {/* BUTTON 1: DIAGNÓSTICO AI */}
            <a-box
              position="-0.75 0.15 0.05"
              width="0.65"
              height="0.22"
              depth="0.08"
              color="#0A2540"
              class="clickable touch-screen-btn"
              touch-screen-button="action: diagnostic; label: DIAGNOSTICO AI"
            >
              <a-text value="DIAGNOSTICO AI" align="center" position="0 0 0.05" color="#00E5FF" width="2.2" font="monoid" class="clickable"></a-text>
            </a-box>

            {/* BUTTON 2: SIMULAR ANOMALÍA */}
            <a-box
              position="0 0.15 0.05"
              width="0.65"
              height="0.22"
              depth="0.08"
              color="#2A1215"
              class="clickable touch-screen-btn"
              touch-screen-button="action: test-alert; label: SIMULAR ANOMALIA"
            >
              <a-text value="SIMULAR ALERTA" align="center" position="0 0 0.05" color="#E2493D" width="2.2" font="monoid" class="clickable"></a-text>
            </a-box>

            {/* BUTTON 3: RESTABLECER / CALIBRAR */}
            <a-box
              position="0.75 0.15 0.05"
              width="0.65"
              height="0.22"
              depth="0.08"
              color="#0E2E18"
              class="clickable touch-screen-btn"
              touch-screen-button="action: calibrate; label: RESTABLECER"
            >
              <a-text value="RESTABLECER" align="center" position="0 0 0.05" color="#22C55E" width="2.2" font="monoid" class="clickable"></a-text>
            </a-box>

            {/* Physical Purge Lever on Console */}
            <a-entity
              class="clickable interactive-lever"
              position="-0.75 -0.05 0.06"
              interactive-lever="machineId: INX-02"
            >
              <a-box class="clickable lever-hitbox" position="0 0.12 0" width="0.45" height="0.45" depth="0.45" material="opacity: 0; transparent: true"></a-box>
              <a-box position="0 0 0" width="0.14" height="0.14" depth="0.06" color="#0F172A"></a-box>
              <a-text value="PURGA" align="center" position="0 -0.1 0.04" color="#E2604F" width="1.4" font="monoid"></a-text>
              <a-entity class="lever-handle" position="0 0 0">
                <a-cylinder class="clickable" position="0 0.12 0.03" radius="0.016" height="0.24" color="#E2E8F0" material="metalness: 0.9"></a-cylinder>
                <a-sphere class="clickable" position="0 0.24 0.03" radius="0.04" color="#E2604F"></a-sphere>
              </a-entity>
            </a-entity>

            {/* Physical Crane Throttle Lever on Console */}
            <a-entity
              class="clickable crane-control-lever"
              position="0.75 -0.05 0.06"
              crane-control-lever
            >
              <a-box class="clickable crane-hitbox" position="0 0.12 0" width="0.45" height="0.45" depth="0.45" material="opacity: 0; transparent: true"></a-box>
              <a-box position="0 0 0" width="0.14" height="0.14" depth="0.06" color="#0F172A"></a-box>
              <a-text value="GRUA 10T" align="center" position="0 -0.1 0.04" color="#FFC107" width="1.4" font="monoid"></a-text>
              <a-entity class="crane-lever-handle" position="0 0 0" rotation="-30 0 0">
                <a-cylinder class="clickable" position="0 0.12 0.03" radius="0.016" height="0.24" color="#E2E8F0" material="metalness: 0.9"></a-cylinder>
                <a-sphere class="clickable" position="0 0.24 0.03" radius="0.04" color="#FFC107"></a-sphere>
              </a-entity>
            </a-entity>
          </a-entity>
        </a-entity>

        {/* ============================================================== */}
        {/* NAVE INDUSTRIAL ARCHITECTURE                                  */}
        {/* ============================================================== */}
        {/* Floor: Slate Gray (#4A5568) */}
        <a-plane position="0 0 0" rotation="-90 0 0" width="26" height="38" color="#4A5568" material="roughness: 0.4; metalness: 0.15"></a-plane>

        {/* Runway: Royal Blue (#0058C6) */}
        <a-plane position="0 0.01 0" rotation="-90 0 0" width="4.8" height="38" color="#0058C6" material="roughness: 0.25; metalness: 0.2"></a-plane>

        {/* Safety lines */}
        <a-plane position="-2.4 0.015 0" rotation="-90 0 0" width="0.14" height="38" color="#FFC107"></a-plane>
        <a-plane position="2.4 0.015 0" rotation="-90 0 0" width="0.14" height="38" color="#FFC107"></a-plane>

        {/* Pedestrian Zebra Crossing */}
        {[-0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6].map((offset, i) => (
          <a-plane
            key={`zebra-${i}`}
            position={`0 0.02 ${11.5 - offset}`}
            rotation="-90 0 0"
            width="3.6"
            height="0.22"
            color="#FFFFFF"
            material="opacity: 0.95"
          ></a-plane>
        ))}

        {/* Walls */}
        <a-box position="-13 5 0" width="0.5" height="10" depth="38" color="#E8ECEF"></a-box>
        <a-box position="13 5 0" width="0.5" height="10" depth="38" color="#E8ECEF"></a-box>
        <a-box position="0 5 -19" width="26.5" height="10" depth="0.5" color="#E8ECEF"></a-box>

        {/* Open Entrance Doorway Portal */}
        <a-box position="-8 5 19" width="10" height="10" depth="0.5" color="#E8ECEF"></a-box>
        <a-box position="8 5 19" width="10" height="10" depth="0.5" color="#E8ECEF"></a-box>
        <a-box position="0 8.5 19" width="6" height="3" depth="0.5" color="#E8ECEF"></a-box>

        <a-box position="-3.0 3.5 18.8" width="0.4" height="7" depth="0.6" color="#0A2540"></a-box>
        <a-box position="3.0 3.5 18.8" width="0.4" height="7" depth="0.6" color="#0A2540"></a-box>
        <a-box position="0 7 18.8" width="6.4" height="0.4" depth="0.6" color="#0A2540"></a-box>

        <a-plane position="-2.2 3.5 18.9" width="1.4" height="6.6" color="#00D2FF" material="transparent: true; opacity: 0.35; side: double"></a-plane>
        <a-plane position="2.2 3.5 18.9" width="1.4" height="6.6" color="#00D2FF" material="transparent: true; opacity: 0.35; side: double"></a-plane>

        {/* Outside Entrance Landscape */}
        <a-plane position="0 0.005 24" rotation="-90 0 0" width="26" height="10" color="#CBD5E1"></a-plane>
        <a-plane position="-8 0.01 24" rotation="-90 0 0" width="8" height="10" color="#2E7D32"></a-plane>
        <a-plane position="8 0.01 24" rotation="-90 0 0" width="8" height="10" color="#2E7D32"></a-plane>
        <a-plane position="0 0.015 24" rotation="-90 0 0" width="4.8" height="10" color="#0058C6"></a-plane>

        {/* Roof Structural Trusses */}
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

        {/* ============================================================== */}
        {/* PUENTE GRÚA 10 TON SENSORTECH                                 */}
        {/* ============================================================== */}
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

        {/* Pedestal Auxiliar con Palanca de Grúa */}
        <a-entity id="crane-control-station" position="2.0 0 6.5" rotation="0 -70 0">
          <a-box position="0 0.5 0" width="0.6" height="1.0" depth="0.5" color="#1E293B"></a-box>
          <a-box position="0 0.98 0" width="0.66" height="0.1" depth="0.56" color="#FFC107"></a-box>
          <a-text value="PUENTE GRUA 10T" align="center" position="0 0.7 0.27" color="#FFC107" width="1.8" font="monoid"></a-text>
          <a-text value="JALAR PARA MOVER" align="center" position="0 0.55 0.27" color="#FFFFFF" width="1.4" font="monoid"></a-text>

          <a-entity
            id="crane-throttle-lever"
            class="clickable crane-control-lever"
            position="0 1.05 0"
            crane-control-lever
          >
            <a-box class="clickable crane-hitbox" position="0 0.3 0" width="0.9" height="1.0" depth="0.9" material="opacity: 0; transparent: true"></a-box>
            <a-box position="0 0 0" width="0.22" height="0.08" depth="0.28" color="#0F172A"></a-box>
            <a-entity class="crane-lever-handle" position="0 0 0" rotation="-30 0 0">
              <a-cylinder class="clickable" position="0 0.2 0" radius="0.025" height="0.4" color="#E2E8F0" material="metalness: 0.9"></a-cylinder>
              <a-sphere class="clickable" position="0 0.42 0" radius="0.065" color="#FFC107"></a-sphere>
            </a-entity>
          </a-entity>
        </a-entity>

        {/* ============================================================== */}
        {/* WAYPOINTS ON FLOOR                                             */}
        {/* ============================================================== */}
        <a-entity
          id="waypoint-1"
          position="0 0.02 10"
          floor-waypoint="pointId: 1; targetX: 0; targetZ: 10; guideX: 2.2; guideZ: 7.2"
          class="clickable"
        >
          <a-ring radius-inner="1.0" radius-outer="1.18" rotation="-90 0 0" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.9"></a-ring>
          <a-circle radius="0.95" rotation="-90 0 0" color="#0058C6" material="opacity: 0.9"></a-circle>
          <a-text value="PUNTO 01 ENTRADA PLANTA 4.0" align="center" position="0 0.03 0.1" rotation="-90 0 0" color="#FFFFFF" width="4.8" font="monoid"></a-text>
        </a-entity>

        <a-entity
          id="waypoint-2"
          position="-2.8 0.02 3"
          floor-waypoint="pointId: 2; targetX: -2.8; targetZ: 3.0; guideX: -0.6; guideZ: 1.2"
          class="clickable"
        >
          <a-ring radius-inner="0.9" radius-outer="1.08" rotation="-90 0 0" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.9"></a-ring>
          <a-circle radius="0.85" rotation="-90 0 0" color="#0058C6" material="opacity: 0.9"></a-circle>
          <a-text value="PUNTO 02 SENSOR IOT ESP32 + BME280" align="center" position="0 0.03 0.1" rotation="-90 0 0" color="#FFFFFF" width="4.2" font="monoid"></a-text>
        </a-entity>

        <a-entity
          id="waypoint-3"
          position="0 0.02 -7"
          floor-waypoint="pointId: 3; targetX: 0; targetZ: -7.5; guideX: 2.5; guideZ: -9.5"
          class="clickable"
        >
          <a-ring radius-inner="1.2" radius-outer="1.4" rotation="-90 0 0" color="#00E5FF" material="emissive: #00E5FF; emissiveIntensity: 0.9"></a-ring>
          <a-circle radius="1.15" rotation="-90 0 0" color="#0058C6" material="opacity: 0.9"></a-circle>
          <a-text value="PUNTO 03 DASHBOARD MACHINE LEARNING" align="center" position="0 0.03 0.1" rotation="-90 0 0" color="#FFFFFF" width="5.0" font="monoid"></a-text>
        </a-entity>

        {/* ============================================================== */}
        {/* PUNTO 02: KIOSKO / PANTALLA TÁCTIL IOT ESP32                  */}
        {/* ============================================================== */}
        <a-entity id="iot-kiosk-station" position="-2.6 0 2.2" rotation="0 45 0">
          <a-cylinder position="0 0.05 0" radius="0.6" height="0.1" color="#14171C"></a-cylinder>
          <a-cylinder position="0 0.7 0" radius="0.1" height="1.2" color="#21262E"></a-cylinder>

          <a-entity position="0 1.35 0" rotation="-22 0 0">
            <a-box position="0 0 -0.04" width="1.6" height="1.15" depth="0.08" color="#14171C"></a-box>
            <a-box position="0 0 -0.06" width="1.66" height="1.21" depth="0.02" color="#3AA8A0"></a-box>

            {/* Live Screen Plane */}
            <a-plane
              id="iotScreenMesh"
              position="0 0 0.02"
              width="1.5"
              height="1.05"
              dynamic-screen="canvasId: iotCanvasEl"
            ></a-plane>

            {/* Interactive Touch Buttons on IoT Kiosk */}
            <a-entity position="0 -0.42 0.06">
              <a-box
                position="-0.48 0 0"
                width="0.42"
                height="0.14"
                depth="0.06"
                color="#262B33"
                class="clickable touch-screen-btn"
                touch-screen-button="action: test-alert; label: TEST ALERTA"
              >
                <a-text value="TEST ALERTA" align="center" position="0 0 0.04" color="#EEF0F2" width="1.8" font="monoid" class="clickable"></a-text>
              </a-box>

              <a-box
                position="0 0 0"
                width="0.42"
                height="0.14"
                depth="0.06"
                color="#262B33"
                class="clickable touch-screen-btn"
                touch-screen-button="action: calibrate; label: CALIBRAR"
              >
                <a-text value="CALIBRAR" align="center" position="0 0 0.04" color="#3AA8A0" width="1.8" font="monoid" class="clickable"></a-text>
              </a-box>

              <a-box
                position="0.48 0 0"
                width="0.42"
                height="0.14"
                depth="0.06"
                color="#262B33"
                class="clickable touch-screen-btn"
                touch-screen-button="action: purge; label: PURGAR"
              >
                <a-text value="PURGAR" align="center" position="0 0 0.04" color="#E2604F" width="1.8" font="monoid" class="clickable"></a-text>
              </a-box>
            </a-entity>
          </a-entity>

          {/* Physical IoT Node Enclosure (ESP32) on stand side */}
          <a-entity position="0.35 0.85 0" rotation="0 -30 0">
            <a-box position="0 0 0" width="0.26" height="0.22" depth="0.1" color="#1B1F26"></a-box>
            <a-sphere
              position="0.08 0.06 0.06"
              radius="0.02"
              color={sensorStateRef.current.anomalySimulated ? '#E2493D' : '#8BD346'}
              material="emissive: #8BD346; emissiveIntensity: 1"
            ></a-sphere>
            <a-cylinder position="0.08 0.16 0" radius="0.008" height="0.12" color="#14171C"></a-cylinder>
            <a-text value="ESP32 IoT" align="center" position="0 0 0.06" color="#3AA8A0" width="1.2" font="monoid"></a-text>
          </a-entity>
        </a-entity>

        {/* ============================================================== */}
        {/* PUNTO 03: MACHINE LEARNING DASHBOARD STAGE                    */}
        {/* ============================================================== */}
        <a-entity id="ml-stage" position="0 0 -13">
          <a-box position="0 0.15 0" width="13" height="0.3" depth="6" color="#14171C"></a-box>
          <a-box position="0 0.3 2.95" width="13" height="0.04" depth="0.1" color="#00E5FF"></a-box>

          <a-box position="0 2.9 -2.2" width="9.6" height="4.8" depth="0.2" color="#14171C"></a-box>
          <a-box position="0 2.9 -2.25" width="9.8" height="5.0" depth="0.05" color="#21262E"></a-box>

          {/* Giant Dashboard Screen Mesh */}
          <a-plane
            id="mainDashboardMesh"
            position="0 2.9 -2.08"
            width="9.2"
            height="4.4"
            dynamic-screen="canvasId: dashCanvasEl"
          ></a-plane>

          {/* Pedestal with Interactive Buttons at eye level right in front of ML Video Wall */}
          <a-entity position="0 0.9 0.5">
            <a-box position="0 0 0" width="4.8" height="0.2" depth="0.5" color="#1B1F26"></a-box>
            <a-box position="0 -0.45 0" width="4.6" height="0.7" depth="0.4" color="#14171C"></a-box>

            {/* Button 1: Diagnóstico AI */}
            <a-box
              position="-1.5 0.12 0"
              width="1.3"
              height="0.24"
              depth="0.1"
              color="#0A2540"
              class="clickable touch-screen-btn"
              touch-screen-button="action: diagnostic; label: DIAGNOSTICO AI"
            >
              <a-text value="DIAGNOSTICO AI" align="center" position="0 0 0.06" color="#00E5FF" width="3.2" font="monoid" class="clickable"></a-text>
            </a-box>

            {/* Button 2: Simular Anomalía */}
            <a-box
              position="0 0.12 0"
              width="1.3"
              height="0.24"
              depth="0.1"
              color="#2A1215"
              class="clickable touch-screen-btn"
              touch-screen-button="action: test-alert; label: SIMULAR ANOMALIA"
            >
              <a-text
                value="SIMULAR ALERTA"
                align="center"
                position="0 0 0.06"
                color="#E2493D"
                width="3.2"
                font="monoid"
                class="clickable"
              ></a-text>
            </a-box>

            {/* Button 3: Reset / Calibrar Sensores */}
            <a-box
              position="1.5 0.12 0"
              width="1.3"
              height="0.24"
              depth="0.1"
              color="#0E2E18"
              class="clickable touch-screen-btn"
              touch-screen-button="action: calibrate; label: RESET SENSORES"
            >
              <a-text value="RESET SENSORES" align="center" position="0 0 0.06" color="#22C55E" width="3.2" font="monoid" class="clickable"></a-text>
            </a-box>
          </a-entity>

          {/* SERVER RACKS */}
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

        {/* BILLBOARDS */}
        <a-entity position="-12.7 5.5 0" rotation="0 90 0">
          <a-box position="0 0 -0.05" width="7" height="3" depth="0.1" color="#14171C"></a-box>
          <a-box position="0 0 -0.07" width="7.2" height="3.2" depth="0.05" color="#3AA8A0"></a-box>
          <a-image src="#sensortech-logo" position="-2.3 0 0.05" width="2" height="2"></a-image>
          <a-text value="SENSORTECH 4.0" position="-0.8 0.6 0.05" color="#EEF0F2" width="7" font="monoid"></a-text>
          <a-text value="MANTENIMIENTO PREDICTIVO // IA" position="-0.8 0.1 0.05" color="#3AA8A0" width="5.5" font="monoid"></a-text>
          <a-text value="Telemetría ESP32 + Redes Neuronales LSTM" position="-0.8 -0.4 0.05" color="#8B93A1" width="4.5" font="monoid"></a-text>
        </a-entity>

        <a-entity position="12.7 5.5 0" rotation="0 -90 0">
          <a-box position="0 0 -0.05" width="7" height="3" depth="0.1" color="#14171C"></a-box>
          <a-box position="0 0 -0.07" width="7.2" height="3.2" depth="0.05" color="#E2604F"></a-box>
          <a-image src="#sensortech-logo" position="2.3 0 0.05" width="2" height="2"></a-image>
          <a-text value="ZERO DOWNTIME" position="-2.8 0.6 0.05" color="#EEF0F2" width="7" font="monoid"></a-text>
          <a-text value="EFICIENCIA OEE SUPERIOR AL 92%" position="-2.8 0.1 0.05" color="#E2604F" width="5.5" font="monoid"></a-text>
          <a-text value="Detección de fatiga en rodamientos y desalineación" position="-2.8 -0.4 0.05" color="#8B93A1" width="4.5" font="monoid"></a-text>
        </a-entity>

        {/* ============================================================== */}
        {/* INJECTION MOLDING MACHINES FLEET (INX-01 to INX-06)            */}
        {/* ============================================================== */}
        {[
          { id: 'INX-01', x: -6.5, z: 9, rot: 90, name: 'INX-01 ENGEL 200T' },
          { id: 'INX-02', x: -6.5, z: 3, rot: 90, name: 'INX-02 ARBURG 370' },
          { id: 'INX-03', x: -6.5, z: -3, rot: 90, name: 'INX-03 KRAUSS 150T' },
          { id: 'INX-04', x: 6.5, z: 9, rot: -90, name: 'INX-04 HAITIAN 160T' },
          { id: 'INX-05', x: 6.5, z: 3, rot: -90, name: 'INX-05 ENGEL 180T' },
          { id: 'INX-06', x: 6.5, z: -3, rot: -90, name: 'INX-06 ARBURG 320' },
        ].map(m => (
          <a-entity
            key={m.id}
            id={`machine-${m.id}`}
            class="machine-unit"
            position={`${m.x} 0 ${m.z}`}
            rotation={`0 ${m.rot} 0`}
          >
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
                <a-torus
                  key={`band-${hidx}`}
                  position={`${hx} 0 0`}
                  rotation="0 90 0"
                  radius="0.24"
                  radius-tubular="0.035"
                  color="#E2604F"
                  material="emissive: #E2604F; emissiveIntensity: 0.5"
                ></a-torus>
              ))}
            </a-entity>

            <a-sphere
              class="steam-purge-cloud"
              position="0 1.5 0"
              radius="0.6"
              color="#FFFFFF"
              material="transparent: true; opacity: 0; roughness: 0.9"
              visible="false"
            ></a-sphere>

            <a-cone position="1.5 2.5 0" radius-bottom="0.22" radius-top="0.55" height="0.9" color="#B0BEC5" material="metalness: 0.8; roughness: 0.25"></a-cone>
            <a-cylinder position="1.5 1.9 0" radius="0.12" height="0.4" color="#0B2046"></a-cylinder>

            <a-box position="0.2 1.6 0.95" rotation="-15 0 0" width="0.75" height="0.5" depth="0.1" color="#0B2046"></a-box>
            <a-plane position="0.2 1.61 1.01" rotation="-15 0 0" width="0.65" height="0.4" color="#0C0E11"></a-plane>
            <a-text value={m.id} align="center" position="0.2 1.65 1.03" rotation="-15 0 0" color="#00E5FF" width="1.8" font="monoid"></a-text>

            <a-entity
              id={`lever-${m.id}`}
              class="clickable interactive-lever"
              position="0.9 1.25 0.96"
              interactive-lever={`machineId: ${m.id}`}
            >
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
              <a-cylinder
                class="status-beacon-green"
                position="0 0.45 0"
                radius="0.06"
                height="0.1"
                color="#22C55E"
                material="emissive: #22C55E; emissiveIntensity: 1.0"
              ></a-cylinder>
              <a-cylinder
                class="status-beacon-amber"
                position="0 0.58 0"
                radius="0.06"
                height="0.1"
                color="#14171C"
                material="emissive: #000; emissiveIntensity: 0"
              ></a-cylinder>
              <a-cylinder
                position="0 0.71 0"
                radius="0.06"
                height="0.1"
                color="#14171C"
                material="emissive: #000; emissiveIntensity: 0"
              ></a-cylinder>
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
