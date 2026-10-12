/**
 * Canvas Texture Manager for SensorTech 3D Screens
 * Renders high-resolution dynamic telemetry and dashboard interfaces.
 * Guaranteed 100% active rendering with instant, dramatic visual responses to button presses:
 * - [DIAGNÓSTICO AI]: Sweeping laser scan, LSTM inference telemetry, confidence score
 * - [SIMULAR ANOMALÍA]: Flashing red critical alert banner, 258°C thermal jump, 7.42 mm/s vibration spike, red machine card
 * - [RESTABLECER]: Instant green normalization, calm curves, stable 99.8% status
 * - [PURGA]: Piston release, pressure drop to 420 hPa, pneumatic steam discharge
 */

export interface SensorData {
  temperature: number;
  pressure: number;
  humidity: number;
  vibration: number;
  current: number;
  status: 'normal' | 'alert' | 'purging' | 'diagnostic';
  anomalySimulated: boolean;
  diagnosticActive: boolean;
  rulHours: number;
}

export class ScreenCanvasManager {
  public iotCanvas: HTMLCanvasElement;
  public dashboardCanvas: HTMLCanvasElement;
  private iotCtx: CanvasRenderingContext2D;
  private dashCtx: CanvasRenderingContext2D;
  private animTick: number = 0;

  constructor() {
    // 1. IoT Screen Canvas (Supports both iotCanvasEl and iotCanvas IDs)
    let iot = (document.getElementById('iotCanvasEl') || document.getElementById('iotCanvas')) as HTMLCanvasElement;
    if (!iot) {
      iot = document.createElement('canvas');
      iot.id = 'iotCanvasEl';
      iot.width = 1024;
      iot.height = 768;
      document.body.appendChild(iot);
    }
    // Also mirror id so any lookups find it
    iot.id = 'iotCanvasEl';
    iot.style.position = 'fixed';
    iot.style.left = '-9999px';
    iot.style.top = '-9999px';
    iot.style.pointerEvents = 'none';

    this.iotCanvas = iot;
    this.iotCtx = this.iotCanvas.getContext('2d', { alpha: false })!;

    // 2. Dashboard Screen Canvas
    let dash = (document.getElementById('dashCanvasEl') || document.getElementById('dashCanvas')) as HTMLCanvasElement;
    if (!dash) {
      dash = document.createElement('canvas');
      dash.id = 'dashCanvasEl';
      dash.width = 2048;
      dash.height = 1024;
      document.body.appendChild(dash);
    }
    dash.id = 'dashCanvasEl';
    dash.style.position = 'fixed';
    dash.style.left = '-9999px';
    dash.style.top = '-9999px';
    dash.style.pointerEvents = 'none';

    this.dashboardCanvas = dash;
    this.dashCtx = this.dashboardCanvas.getContext('2d', { alpha: false })!;

    // Draw initial frame immediately
    const initialData: SensorData = {
      temperature: 219.5,
      pressure: 1012.3,
      humidity: 41.5,
      vibration: 3.72,
      current: 43.4,
      status: 'normal',
      anomalySimulated: false,
      diagnosticActive: false,
      rulHours: 1420
    };
    this.drawIoT(initialData);
    this.drawDashboard(initialData);
  }

  public update(data: SensorData) {
    this.animTick += 0.08;
    this.drawIoT(data);
    this.drawDashboard(data);
    this.notifyMaterialsUpdate();
  }

  public notifyMaterialsUpdate() {
    try {
      const dashEl = document.querySelector('#mainDashboardMesh') as any;
      if (dashEl) {
        const mesh = dashEl.getObject3D('mesh');
        if (mesh && mesh.material && mesh.material.map) {
          mesh.material.map.needsUpdate = true;
        }
      }

      const iotEl = document.querySelector('#iotScreenMesh') as any;
      if (iotEl) {
        const mesh = iotEl.getObject3D('mesh');
        if (mesh && mesh.material && mesh.material.map) {
          mesh.material.map.needsUpdate = true;
        }
      }
    } catch {
      // ignore
    }
  }

  private drawIoT(data: SensorData) {
    const ctx = this.iotCtx;
    const w = this.iotCanvas.width;
    const h = this.iotCanvas.height;

    // Background #14171C
    ctx.fillStyle = '#14171C';
    ctx.fillRect(0, 0, w, h);

    // Dynamic border color
    ctx.strokeStyle = data.anomalySimulated ? '#E2493D' : (data.diagnosticActive ? '#00E5FF' : (data.status === 'purging' ? '#E2604F' : '#3AA8A0'));
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);

    // Header bar #1B1F26
    ctx.fillStyle = '#1B1F26';
    ctx.fillRect(15, 15, w - 30, 95);

    // Title
    ctx.fillStyle = '#EEF0F2';
    ctx.font = 'bold 32px "JetBrains Mono", monospace';
    ctx.fillText('NODO IOT SENSORTECH - ESTACION INX-02', 38, 70);

    // Status Pill
    let badgeColor = '#8BD346';
    let badgeText = 'ESP32 ONLINE';
    if (data.anomalySimulated) {
      badgeColor = '#E2493D';
      badgeText = 'ALERTA CRITICA';
    } else if (data.diagnosticActive) {
      badgeColor = '#00E5FF';
      badgeText = 'DIAGNOSTICO IA';
    } else if (data.status === 'purging') {
      badgeColor = '#F0A93A';
      badgeText = 'PURGA EN CURSO';
    }

    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(w - 230, 58, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#EEF0F2';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText(badgeText, w - 205, 66);

    // Metric cards grid
    const cards = [
      {
        label: 'TEMPERATURA BOQUILLA',
        val: `${data.temperature.toFixed(1)} °C`,
        color: data.anomalySimulated ? '#E2493D' : '#E2604F',
        sub: data.anomalySimulated ? '¡SOBRECALENTAMIENTO CRÍTICO!' : 'PT100 / Zona Plastificación'
      },
      {
        label: 'PRESION HIDRAULICA',
        val: `${data.pressure.toFixed(1)} hPa`,
        color: '#3AA8A0',
        sub: data.status === 'purging' ? 'Válvula de Purga Descargada' : 'Transductor BME280'
      },
      {
        label: 'HUMEDAD AMBIENTAL',
        val: `${data.humidity.toFixed(1)} %`,
        color: '#6B7FD6',
        sub: 'Higrómetro BME280'
      },
      {
        label: 'VIBRACION MECANICA',
        val: `${data.vibration.toFixed(2)} mm/s`,
        color: data.vibration > 5 ? '#E2493D' : '#22C55E',
        sub: data.vibration > 5 ? '¡ALTA VIBRACION DETECTADA!' : 'Acelerómetro MPU6050 (Nominal)'
      },
      {
        label: 'CORRIENTE MOTOR',
        val: `${data.current.toFixed(1)} A`,
        color: '#EEF0F2',
        sub: 'Pinza Amperimétrica SCT-013'
      },
      {
        label: 'ESTADO OPERATIVO',
        val: data.status.toUpperCase(),
        color: data.anomalySimulated ? '#E2493D' : (data.status === 'purging' ? '#F0A93A' : '#22C55E'),
        sub: data.anomalySimulated ? 'Fallo Mecánico Inminente' : (data.status === 'purging' ? 'Ciclo Manual de Purga' : 'Ciclo Automático Activo')
      }
    ];

    cards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 32 + col * 480;
      const y = 125 + row * 155;

      ctx.fillStyle = '#1B1F26';
      ctx.fillRect(x, y, 460, 140);
      ctx.strokeStyle = data.anomalySimulated && (idx === 0 || idx === 3) ? '#E2493D' : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 460, 140);

      ctx.fillStyle = c.color;
      ctx.fillRect(x, y, 10, 140);

      ctx.fillStyle = '#8B93A1';
      ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(c.label, x + 26, y + 36);

      ctx.fillStyle = c.color;
      ctx.font = 'bold 44px "JetBrains Mono", monospace';
      ctx.fillText(c.val, x + 26, y + 88);

      ctx.fillStyle = c.color === '#E2493D' ? '#E2493D' : '#565D68';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(c.sub, x + 26, y + 122);
    });

    // Hardware Footer
    ctx.fillStyle = '#21262E';
    ctx.fillRect(32, 605, w - 64, 136);
    ctx.strokeStyle = data.anomalySimulated ? '#E2493D' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 605, w - 64, 136);

    ctx.fillStyle = data.anomalySimulated ? '#E2493D' : '#3AA8A0';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('MODULO IOT: ESP32-WROOM-32D // TELEMETRIA MQTT ACTIVA', 54, 646);

    ctx.fillStyle = '#EEF0F2';
    ctx.font = '18px "Plus Jakarta Sans", sans-serif';
    if (data.anomalySimulated) {
      ctx.fillText('¡ATENCION!: El sensor detectó vibración anormal. Presiona [CALIBRAR] para resetear.', 54, 680);
      ctx.fillText('Diagnóstico: Rodamiento con fatiga térmica acelerada en estación INX-02.', 54, 712);
    } else {
      ctx.fillText('Transmisión inalámbrica cifrada hacia Cluster Machine Learning a 10 Hz', 54, 680);
      ctx.fillText('Interactúa con [TEST ALERTA], [CALIBRAR] o [PURGAR] usando el láser o clic.', 54, 712);
    }
  }

  private drawDashboard(data: SensorData) {
    const ctx = this.dashCtx;
    const w = this.dashboardCanvas.width;
    const h = this.dashboardCanvas.height;

    // Background #0C0E11
    ctx.fillStyle = '#0C0E11';
    ctx.fillRect(0, 0, w, h);

    // Flashing Alert Header
    ctx.fillStyle = data.anomalySimulated ? '#2A1215' : '#14171C';
    ctx.fillRect(0, 0, w, 115);
    ctx.strokeStyle = data.anomalySimulated ? '#E2493D' : (data.diagnosticActive ? '#00E5FF' : 'rgba(255, 255, 255, 0.16)');
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, w, 115);

    // Logo Icon
    ctx.fillStyle = data.anomalySimulated ? '#E2493D' : (data.diagnosticActive ? '#00E5FF' : '#3AA8A0');
    ctx.beginPath();
    ctx.arc(70, 58, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0C0E11';
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillText('ST4', 46, 67);

    ctx.fillStyle = '#EEF0F2';
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.fillText('SENSORTECH AI - SERVIDOR CENTRAL DE MANTENIMIENTO PREDICTIVO', 130, 55);

    ctx.fillStyle = '#8B93A1';
    ctx.font = '20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('CLUSTER GPU/IOT // BROKER MQTT TLS // PLANTA DE INYECCION 4.0', 130, 90);

    // Big Top Status Badge (changes immediately and prominently!)
    let headerStatus = '[SISTEMA OPERATIVO 99.8%]';
    let headerColor = '#22C55E';
    if (data.anomalySimulated) {
      headerStatus = '[¡ALERTA CRITICA ACTIVADA!]';
      headerColor = '#E2493D';
    } else if (data.diagnosticActive) {
      headerStatus = '[DIAGNOSTICO IA EN PROCESO...]';
      headerColor = '#00E5FF';
    } else if (data.status === 'purging') {
      headerStatus = '[CICLO DE PURGA INICIADO]';
      headerColor = '#F0A93A';
    }

    ctx.fillStyle = headerColor;
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.fillText(headerStatus, w - 540, 68);

    // 1. LEFT PANEL: Thermal & Pressure Curves
    ctx.fillStyle = data.anomalySimulated ? '#1E1215' : '#14171C';
    ctx.fillRect(30, 135, 960, 415);
    ctx.strokeStyle = data.anomalySimulated ? '#E2493D' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 135, 960, 415);

    ctx.fillStyle = '#EEF0F2';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('1. CURVA TERMICA DE CILINDRO DE INYECCION Y PRESION HIDRAULICA', 50, 175);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let gy = 205; gy <= 510; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(50, gy);
      ctx.lineTo(960, gy);
      ctx.stroke();
    }

    // Temperature Curve (Spikes in RED on anomaly!)
    ctx.strokeStyle = data.anomalySimulated ? '#E2493D' : '#E2604F';
    ctx.lineWidth = data.anomalySimulated ? 6 : 4;
    ctx.beginPath();
    for (let x = 0; x < 900; x += 15) {
      const px = 60 + x;
      const spike = data.anomalySimulated ? 75 + Math.sin(x * 0.08) * 15 : 0;
      const py = 320 - Math.sin((x * 0.02) + this.animTick) * 35 - spike;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Pressure Curve
    ctx.strokeStyle = '#3AA8A0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < 900; x += 15) {
      const px = 60 + x;
      const drop = data.status === 'purging' ? 45 : 0;
      const py = 440 - Math.sin((x * 0.035) + this.animTick * 1.5) * 28 + drop;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Diagnostic sweep line
    if (data.diagnosticActive) {
      const sweepX = 60 + ((this.animTick * 180) % 880);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sweepX, 200);
      ctx.lineTo(sweepX, 510);
      ctx.stroke();
    }

    // Legends
    ctx.fillStyle = data.anomalySimulated ? '#E2493D' : '#E2604F';
    ctx.fillRect(60, 515, 20, 10);
    ctx.fillText(`TEMPERATURA BOQUILLA (${data.temperature.toFixed(1)} °C)`, 90, 525);

    ctx.fillStyle = '#3AA8A0';
    ctx.fillRect(520, 515, 20, 10);
    ctx.fillText(`PRESION HIDRAULICA (${data.pressure.toFixed(1)} hPa)`, 550, 525);

    // 2. LOWER PANEL: FFT Vibration Spectrum
    ctx.fillStyle = data.anomalySimulated ? '#1E1215' : '#14171C';
    ctx.fillRect(30, 570, 960, 420);
    ctx.strokeStyle = data.anomalySimulated ? '#E2493D' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 570, 960, 420);

    ctx.fillStyle = '#EEF0F2';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('2. ANALISIS ESPECTRAL DE VIBRACION (FFT) Y CORRIENTE MOTOR', 50, 610);

    const barCount = 24;
    const barW = 30;
    const gap = 8;
    for (let b = 0; b < barCount; b++) {
      const bx = 60 + b * (barW + gap);
      const hNorm = Math.abs(Math.sin((b * 0.5) + this.animTick * 2.2)) * 170 + 35;
      const bh = data.anomalySimulated && b > 11 ? hNorm * 1.95 : hNorm;
      const by = 920 - bh;

      if (data.anomalySimulated && b > 11) {
        ctx.fillStyle = '#E2493D';
      } else if (data.diagnosticActive) {
        ctx.fillStyle = '#00E5FF';
      } else {
        ctx.fillStyle = (b % 2 === 0) ? '#6B7FD6' : '#3AA8A0';
      }
      ctx.fillRect(bx, by, barW, bh);

      ctx.fillStyle = '#EEF0F2';
      ctx.fillRect(bx, by - 6, barW, 3);
    }

    ctx.fillStyle = data.anomalySimulated ? '#E2493D' : '#8B93A1';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText(data.anomalySimulated ? '¡ATENCION!: Picos armónicos elevados en 1 kHz - 5 kHz (Rodamiento INX-02)' : '0 Hz (Baja Frec.) ------------ 1 kHz (Rodamientos) ------------ 5 kHz (Cavitación)', 60, 955);

    // 3. RIGHT PANEL: Fleet Overview & Predictions
    ctx.fillStyle = '#14171C';
    ctx.fillRect(1010, 135, 1000, 855);
    ctx.strokeStyle = data.anomalySimulated ? '#E2493D' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1010, 135, 1000, 855);

    ctx.fillStyle = '#EEF0F2';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillText('3. MODELO PREDICTIVO IA - RANDOM FOREST & REDES LSTM', 1040, 180);

    const machines = [
      { id: 'INX-01', model: 'ENGEL VICTORY 200T', status: 'ESTABLE', color: '#22C55E', rul: '2,450 h', conf: '99.2%' },
      {
        id: 'INX-02',
        model: 'ARBURG ALLROUNDER 370',
        status: data.anomalySimulated ? 'ALERTA CRITICA' : 'ESTABLE (IOT)',
        color: data.anomalySimulated ? '#E2493D' : '#22C55E',
        rul: `${data.rulHours} h`,
        conf: data.anomalySimulated ? '99.8% (FALLO)' : '98.7%'
      },
      { id: 'INX-03', model: 'KRAUSS MAFFEI 150T', status: 'ALERTA PREVENTIVA', color: '#F0A93A', rul: '680 h', conf: '94.1%' },
      { id: 'INX-04', model: 'HAITIAN MARS III 160T', status: 'ESTABLE', color: '#22C55E', rul: '3,100 h', conf: '99.5%' }
    ];

    machines.forEach((m, idx) => {
      const my = 220 + idx * 135;
      ctx.fillStyle = m.status === 'ALERTA CRITICA' ? '#32161A' : '#1B1F26';
      ctx.fillRect(1040, my, 940, 115);
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(1040, my, 940, 115);

      ctx.fillStyle = m.color;
      ctx.fillRect(1040, my, 12, 115);

      ctx.fillStyle = '#EEF0F2';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.fillText(`${m.id} // ${m.model}`, 1070, my + 42);

      ctx.fillStyle = '#8B93A1';
      ctx.font = '18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Vida Útil Remanente (RUL): ${m.rul}  |  Confianza: ${m.conf}`, 1070, my + 82);

      // Pill
      ctx.fillStyle = m.color;
      ctx.fillRect(1810, my + 30, 150, 48);
      ctx.fillStyle = m.color === '#22C55E' ? '#0C0E11' : '#FFFFFF';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(m.status === 'ESTABLE' ? 'NORMAL' : (m.status === 'ALERTA CRITICA' ? 'CRITICO' : 'ALERTA'), 1835, my + 60);
    });

    // Diagnostic Box (Changes dynamically on button clicks!)
    ctx.fillStyle = data.anomalySimulated ? '#2E1518' : (data.diagnosticActive ? '#152E2C' : '#21262E');
    ctx.fillRect(1040, 775, 940, 195);
    ctx.strokeStyle = data.anomalySimulated ? '#E2493D' : (data.diagnosticActive ? '#00E5FF' : 'rgba(255, 255, 255, 0.16)');
    ctx.lineWidth = 2;
    ctx.strokeRect(1040, 775, 940, 195);

    ctx.fillStyle = data.anomalySimulated ? '#E2493D' : (data.diagnosticActive ? '#00E5FF' : '#3AA8A0');
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('DIAGNOSTICO PREDICTIVO DEL SISTEMA', 1070, 818);

    ctx.fillStyle = '#EEF0F2';
    ctx.font = '20px "Plus Jakarta Sans", sans-serif';

    if (data.diagnosticActive) {
      ctx.fillStyle = '#00E5FF';
      ctx.fillText('>> EJECUTANDO RED NEURONAL LSTM & RANDOM FOREST...', 1070, 862);
      ctx.fillStyle = '#EEF0F2';
      ctx.fillText('Analizando 14,800 registros de telemetría por segundo en GPU Cluster...', 1070, 902);
      ctx.fillText('Resultado: Inferencia predictiva completa. Precisión del modelo: 99.4%', 1070, 942);
    } else if (data.anomalySimulated) {
      ctx.fillStyle = '#E2493D';
      ctx.fillText('(!) ANOMALIA DETECTADA: Desgaste crítico en rodamiento de cilindro INX-02.', 1070, 862);
      ctx.fillStyle = '#EEF0F2';
      ctx.fillText('Riesgo de parada no programada en menos de 24 horas.', 1070, 902);
      ctx.fillText('Recomendación IA: Programar sustitución de cojinetes en próximo turno.', 1070, 942);
    } else {
      ctx.fillText('Todos los parámetros mecánicos y térmicos operan dentro del estándar ISO 10816-3.', 1070, 862);
      ctx.fillText('Modelo predictivo auto-calibrado con 14.8 millones de puntos sensoriales procesados.', 1070, 902);
      ctx.fillText('Próximo mantenimiento preventivo programado dentro de 1,420 horas de ciclo.', 1070, 942);
    }
  }
}
