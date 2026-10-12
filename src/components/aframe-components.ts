/**
 * SensorTech A-Frame Custom Components
 */
import { audioService } from '../services/audioService';

declare const THREE: any;

export function registerAFrameComponents() {
  if (typeof window === 'undefined' || !window.AFRAME) return;

  const AFRAME = window.AFRAME;
  if (AFRAME.components['dynamic-screen']) return;

  // 1. DYNAMIC SCREEN COMPONENT
  AFRAME.registerComponent('dynamic-screen', {
    schema: { canvasId: { type: 'string', default: 'iotCanvasEl' } },
    init: function () {
      const el = this.el;
      const self = this;
      const bindTexture = () => {
        const canvas = document.getElementById(self.data.canvasId) as HTMLCanvasElement;
        const mesh = el.getObject3D('mesh');
        if (!canvas || !mesh) {
          setTimeout(bindTexture, 80);
          return;
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
        self.texture = texture;
        mesh.material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        mesh.material.needsUpdate = true;
      };
      if (el.hasLoaded) bindTexture();
      else el.addEventListener('loaded', bindTexture);
    },
    tick: function () {
      if (this.texture) this.texture.needsUpdate = true;
    }
  });

  // 2. META QUEST 3 CONTROLLER COMPONENT (JOYSTICKS REPARADOS)
  AFRAME.registerComponent('quest-controller-interaction', {
    schema: { hand: { type: 'string', default: 'right' } },
    init: function () {
      const el = this.el;
      const self = this;

      const handleAction = (evt: Event) => {
        audioService.unlock();
        const raycaster = el.components.raycaster;
        if (raycaster && raycaster.intersectedEls && raycaster.intersectedEls.length > 0) {
          const target = raycaster.intersectedEls[0];
          self.triggerHaptic(0.85, 80);
          target.emit('click', { cursorEl: el, hand: self.data.hand });
          target.emit('triggerdown', { hand: self.data.hand });

          const lever = target.closest('[interactive-lever]');
          if (lever) { lever.emit('pull', { hand: self.data.hand }); return; }

          const craneLever = target.closest('[crane-control-lever]');
          if (craneLever) { craneLever.emit('pull', { hand: self.data.hand }); return; }

          const screenBtn = target.closest('[touch-screen-button]');
          if (screenBtn) { screenBtn.emit('press', { hand: self.data.hand }); return; }

          const waypoint = target.closest('[floor-waypoint]');
          if (waypoint) { waypoint.emit('select-waypoint'); return; }
        }
      };

      el.addEventListener('triggerdown', handleAction);
      el.addEventListener('gripdown', handleAction);

      // LÓGICA DE JOYSTICKS
      el.addEventListener('thumbstickmoved', (evt: any) => {
        const detail = evt.detail;
        if (!detail) return;
        const rig = document.querySelector('#rig') as any;
        if (!rig) return;

        // Mano Derecha: Giro rápido de cámara (Intacto)
        if (self.data.hand === 'right' && Math.abs(detail.x) > 0.75) {
          if (!self.stickCooldown) {
            self.stickCooldown = true;
            const rot = rig.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
            const turnAngle = detail.x > 0 ? -45 : 45;
            rig.setAttribute('rotation', { x: rot.x, y: rot.y + turnAngle, z: rot.z });
            setTimeout(() => { self.stickCooldown = false; }, 350);
          }
        }

        // Mano Izquierda: Movimiento 360 grados (Adelante, atrás y lados)
        if (self.data.hand === 'left') {
          const xActive = Math.abs(detail.x) > 0.15;
          const yActive = Math.abs(detail.y) > 0.15;
          
          if (xActive || yActive) {
            const pos = rig.getAttribute('position') || { x: 0, y: 0, z: 10 };
            
            // Obtener rotación del jugador y de la cámara (cabeza)
            const rigRot = rig.getAttribute('rotation') || { y: 0 };
            const cam = document.querySelector('#camera') as any;
            const camRot = cam ? cam.getAttribute('rotation') : { y: 0 };
            
            // Hacia dónde mira el jugador realmente
            const totalRotY = rigRot.y + camRot.y;
            const rad = (totalRotY * Math.PI) / 180;
            
            let dx = 0;
            let dz = 0;
            const speedMulti = 0.08;

            // Adelante / Atrás
            if (yActive) {
              dx += Math.sin(rad) * (detail.y * speedMulti);
              dz += Math.cos(rad) * (detail.y * speedMulti);
            }
            
            // Lados (Strafe)
            if (xActive) {
              dx += Math.cos(rad) * (detail.x * speedMulti);
              dz -= Math.sin(rad) * (detail.x * speedMulti);
            }

            rig.setAttribute('position', {
              x: Math.max(-12, Math.min(12, pos.x + dx)),
              y: pos.y,
              z: Math.max(-18, Math.min(24, pos.z + dz))
            });
          }
        }
      });
    },
    triggerHaptic: function (intensity: number, duration: number) {
      try {
        const trackedControls = this.el.components['tracked-controls'];
        const gamepad = trackedControls && trackedControls.controller;
        if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
          gamepad.hapticActuators[0].pulse(intensity, duration);
        }
      } catch (e) {}
    }
  });

  // 3. MACHINE INJECTION & PURGE LEVER COMPONENT
  AFRAME.registerComponent('interactive-lever', {
    schema: { machineId: { type: 'string', default: 'INX-02' } },
    init: function () {
      const el = this.el;
      const self = this;
      this.isPulled = false;
      const triggerAction = () => {
        self.isPulled = !self.isPulled;
        audioService.playLeverPurge();
        const handle = el.querySelector('.lever-handle');
        if (handle) {
          handle.setAttribute('animation', { property: 'rotation', to: self.isPulled ? '42 0 0' : '0 0 0', dur: 280, easing: 'easeOutBack' });
        }
        const machine = el.closest('.machine-unit');
        if (machine) {
          const piston = machine.querySelector('.injection-piston');
          if (piston) {
            piston.setAttribute('animation__forward', { property: 'position', to: '0.4 1.5 0', dur: 350, easing: 'easeOutQuad' });
            setTimeout(() => {
              piston.setAttribute('animation__back', { property: 'position', to: '0 1.5 0', dur: 450, easing: 'easeInOutQuad' });
            }, 500);
          }
          const steam = machine.querySelector('.steam-purge-cloud');
          if (steam) {
            steam.setAttribute('visible', 'true');
            steam.setAttribute('animation__scale', { property: 'scale', from: '0.1 0.1 0.1', to: '1.2 1.2 1.2', dur: 500, easing: 'easeOutQuad' });
            steam.setAttribute('animation__fade', { property: 'material.opacity', from: '0.85', to: '0.0', dur: 650, easing: 'easeOutQuad' });
            setTimeout(() => { steam.setAttribute('visible', 'false'); }, 700);
          }
          const amber = machine.querySelector('.status-beacon-amber');
          const green = machine.querySelector('.status-beacon-green');
          if (amber && green) {
            if (self.isPulled) {
              amber.setAttribute('material', 'color: #FFC107; emissive: #FFC107; emissiveIntensity: 1.0');
              green.setAttribute('material', 'color: #14171C; emissive: #000; emissiveIntensity: 0');
            } else {
              amber.setAttribute('material', 'color: #14171C; emissive: #000; emissiveIntensity: 0');
              green.setAttribute('material', 'color: #22C55E; emissive: #22C55E; emissiveIntensity: 1.0');
            }
          }
        }
        window.dispatchEvent(new CustomEvent('sensortech:screen-action', { detail: { action: 'purge', label: 'PURGA' } }));
      };
      el.addEventListener('click', triggerAction);
      el.addEventListener('pull', triggerAction);
      const hitbox = el.querySelector('.lever-hitbox');
      if (hitbox) hitbox.addEventListener('click', triggerAction);
    }
  });

  // 4. OVERHEAD CRANE CONTROLLER LEVER
  AFRAME.registerComponent('crane-control-lever', {
    init: function () {
      const el = this.el;
      this.isMoved = false;
      const operateCrane = () => {
        this.isMoved = !this.isMoved;
        audioService.playCraneMove();
        const handle = el.querySelector('.crane-lever-handle');
        if (handle) {
          handle.setAttribute('animation', { property: 'rotation', to: this.isMoved ? '40 0 0' : '-35 0 0', dur: 300, easing: 'easeOutQuad' });
        }
        const crane = document.querySelector('#overhead-crane') as any;
        if (crane) {
          const targetZ = this.isMoved ? -6 : 3.5;
          crane.setAttribute('animation__move', { property: 'position', to: `0 7.8 ${targetZ}`, dur: 3200, easing: 'easeInOutQuad' });
        }
        const trolley = document.querySelector('#crane-trolley') as any;
        if (trolley) {
          const targetX = this.isMoved ? 2.8 : -2.8;
          trolley.setAttribute('animation__trolley', { property: 'position', to: `${targetX} -0.5 0`, dur: 3000, easing: 'easeInOutQuad' });
        }
      };
      el.addEventListener('click', operateCrane);
      el.addEventListener('pull', operateCrane);
      const hitbox = el.querySelector('.crane-hitbox');
      if (hitbox) hitbox.addEventListener('click', operateCrane);
    }
  });

  // 5. TOUCH SCREEN BUTTON COMPONENT
  AFRAME.registerComponent('touch-screen-button', {
    schema: { action: { type: 'string', default: 'test' }, label: { type: 'string', default: 'BOTON' } },
    init: function () {
      const el = this.el;
      const self = this;
      const handlePress = (evt?: any) => {
        if (evt && evt.stopPropagation) evt.stopPropagation();
        audioService.playBeep(true);
        el.setAttribute('material', 'color: #00E5FF; emissive: #00E5FF; emissiveIntensity: 1.0');
        setTimeout(() => { el.setAttribute('material', 'color: #262B33; emissive: #000; emissiveIntensity: 0'); }, 220);
        window.dispatchEvent(new CustomEvent('sensortech:screen-action', { detail: { action: self.data.action, label: self.data.label } }));
      };
      el.addEventListener('click', handlePress);
      el.addEventListener('press', handlePress);
      el.addEventListener('triggerdown', handlePress);
      const textChild = el.querySelector('a-text');
      if (textChild) { textChild.addEventListener('click', handlePress); textChild.classList.add('clickable'); }
    }
  });

  // 6. VIRTUAL GUIDE COMPONENT
  AFRAME.registerComponent('virtual-guide', {
    init: function () {
      this.ring1 = this.el.querySelector('.guide-ring-1');
      this.ring2 = this.el.querySelector('.guide-ring-2');
      this.ring3 = this.el.querySelector('.guide-ring-3');
      this.core = this.el.querySelector('.guide-core');
      this.time = 0;
    },
    tick: function (time: number, timeDelta: number) {
      this.time += (timeDelta || 16) * 0.001;
      if (this.ring1) { this.ring1.object3D.rotation.y += 0.025; this.ring1.object3D.rotation.z += 0.012; }
      if (this.ring2) { this.ring2.object3D.rotation.x += 0.035; this.ring2.object3D.rotation.y -= 0.018; }
      if (this.ring3) { this.ring3.object3D.rotation.z -= 0.028; }
      if (this.core) { this.core.object3D.position.y = Math.sin(this.time * 2.2) * 0.08; }
    }
  });

  // 7. FLOOR WAYPOINT COMPONENT
  AFRAME.registerComponent('floor-waypoint', {
    schema: {
      pointId: { type: 'number', default: 1 },
      targetX: { type: 'number', default: 0 },
      targetZ: { type: 'number', default: 10 },
      guideX: { type: 'number', default: 2.2 },
      guideZ: { type: 'number', default: 7.2 }
    },
    init: function () {
      const el = this.el;
      const self = this;
      const triggerTeleport = () => {
        audioService.unlock();
        audioService.playBeep(false);
        const rig = document.querySelector('#rig') as any;
        if (rig) {
          rig.setAttribute('animation', { property: 'position', to: `${self.data.targetX} 0 ${self.data.targetZ}`, dur: 800, easing: 'easeInOutCubic' });
        }
        const guide = document.querySelector('#virtual-guide-entity') as any;
        if (guide) {
          guide.setAttribute('animation', { property: 'position', to: `${self.data.guideX} 1.6 ${self.data.guideZ}`, dur: 1100, easing: 'easeInOutQuad' });
        }
        setTimeout(() => { audioService.speakWaypoint(self.data.pointId); }, 500);
        window.dispatchEvent(new CustomEvent('sensortech:waypoint-selected', { detail: { pointId: self.data.pointId } }));
      };
      el.addEventListener('click', triggerTeleport);
      el.addEventListener('select-waypoint', triggerTeleport);
    }
  });
}
