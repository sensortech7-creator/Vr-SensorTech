/**
 * SensorTech A-Frame Custom Components
 * - dynamic-screen: Binds an HTML5 2D canvas texture to an A-Frame 3D plane mesh with continuous GPU texture upload
 * - quest-controller-interaction: Oculus Touch (Meta Quest 3) raycaster, triggerdown & gripdown handlers, haptics, physical proximity
 * - interactive-lever: Machine injection & purge lever with mechanical clunk, piston animation, steam burst, and audio
 * - crane-control-lever: Physical throttle lever that moves the 10-Ton Overhead Crane across the factory ceiling
 * - touch-screen-button: 3D interactive tactile button with physical depression animation, click feedback, and event dispatch
 * - virtual-guide: SensorTech IA Guide robot with concentric rotating gimbal rings and smooth levitation
 * - floor-waypoint: Teleportation target rings with camera movement and voice narration
 */

import { audioService } from '../services/audioService';

export function registerAFrameComponents() {
  if (typeof window === 'undefined' || !window.AFRAME) {
    return;
  }

  const AFRAME = window.AFRAME;

  // 1. DYNAMIC SCREEN TEXTURE COMPONENT (Ensures 2D Canvas is projected onto 3D screens)
  if (!AFRAME.components['dynamic-screen']) {
    AFRAME.registerComponent('dynamic-screen', {
      schema: {
        canvasId: { type: 'string', default: 'dashCanvasEl' }
      },

      init: function () {
        const el = this.el;
        const canvasId = this.data.canvasId;
        this.texture = null;

        const bindTexture = () => {
          const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
          if (!canvas) {
            setTimeout(bindTexture, 100);
            return;
          }

          const THREE = AFRAME.THREE || (window as any).THREE;
          if (!THREE) return;

          this.texture = new THREE.CanvasTexture(canvas);
          this.texture.minFilter = THREE.LinearFilter;
          this.texture.magFilter = THREE.LinearFilter;
          this.texture.generateMipmaps = false;

          const applyToMesh = () => {
            const mesh = el.getObject3D('mesh');
            if (mesh) {
              mesh.material = new THREE.MeshBasicMaterial({
                map: this.texture,
                side: THREE.DoubleSide
              });
              mesh.material.needsUpdate = true;
            }
          };

          applyToMesh();
          el.addEventListener('loaded', applyToMesh, { once: true });
        };

        bindTexture();
      },

      tick: function () {
        if (this.texture) {
          this.texture.needsUpdate = true;
        }
      }
    });
  }

  // 2. CANVAS UPDATER (Continuous GPU material upload)
  if (!AFRAME.components['canvas-updater']) {
    AFRAME.registerComponent('canvas-updater', {
      init: function () {
        this.mesh = this.el.getObject3D('mesh');
      },

      tick: function () {
        if (!this.mesh) {
          this.mesh = this.el.getObject3D('mesh');
        }
        if (this.mesh && this.mesh.material && this.mesh.material.map) {
          this.mesh.material.map.needsUpdate = true;
        }
      }
    });
  }

  // 3. META QUEST 3 CONTROLLER INTERACTION COMPONENT
  if (!AFRAME.components['quest-controller-interaction']) {
    AFRAME.registerComponent('quest-controller-interaction', {
      schema: {
        hand: { type: 'string', default: 'right' }
      },

      init: function () {
        const el = this.el;
        const self = this;

        const handleAction = () => {
          audioService.unlock();

          const raycaster = el.components.raycaster;
          if (raycaster && raycaster.intersectedEls && raycaster.intersectedEls.length > 0) {
            const target = raycaster.intersectedEls[0];
            self.triggerHaptic(0.9, 100);

            // Direct emission
            target.emit('click', { cursorEl: el, hand: self.data.hand }, true);
            target.emit('triggerdown', { hand: self.data.hand }, true);

            // Look for closest interactive element
            const interactiveTarget = target.closest(
              '[touch-screen-button], [interactive-lever], [crane-control-lever], [floor-waypoint]'
            );
            if (interactiveTarget && interactiveTarget !== target) {
              interactiveTarget.emit('click', { cursorEl: el, hand: self.data.hand }, true);
              interactiveTarget.emit('press', { hand: self.data.hand }, true);
              interactiveTarget.emit('pull', { hand: self.data.hand }, true);
            }
          }
        };

        el.addEventListener('triggerdown', handleAction);
        el.addEventListener('gripdown', handleAction);

        // Thumbstick Locomotion & Snap Turn
        el.addEventListener('thumbstickmoved', (evt: any) => {
          const detail = evt.detail;
          if (!detail) return;
          const rig = document.querySelector('#rig') as any;
          if (!rig) return;

          // Right stick: 45° Snap turn
          if (self.data.hand === 'right' && Math.abs(detail.x) > 0.75) {
            if (!self.stickCooldown) {
              self.stickCooldown = true;
              const rot = rig.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
              const turnAngle = detail.x > 0 ? -45 : 45;
              rig.setAttribute('rotation', { x: rot.x, y: rot.y + turnAngle, z: rot.z });
              setTimeout(() => { self.stickCooldown = false; }, 350);
            }
          }

          // Left stick: Smooth walk forward / backward
          if (self.data.hand === 'left' && Math.abs(detail.y) > 0.25) {
            const pos = rig.getAttribute('position') || { x: 0, y: 0, z: 10 };
            const rot = rig.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
            const rad = (rot.y * Math.PI) / 180;
            const speed = detail.y * 0.12;
            rig.setAttribute('position', {
              x: Math.max(-6, Math.min(6, pos.x + Math.sin(rad) * speed)),
              y: pos.y,
              z: Math.max(-16, Math.min(16, pos.z + Math.cos(rad) * speed))
            });
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
        } catch {
          // ignore
        }
      }
    });
  }

  // 4. TOUCH SCREEN BUTTON COMPONENT (Supports 3D visual click + instant action execution)
  if (!AFRAME.components['touch-screen-button']) {
    AFRAME.registerComponent('touch-screen-button', {
      schema: {
        action: { type: 'string', default: 'test' },
        label: { type: 'string', default: 'BOTON' }
      },

      init: function () {
        const el = this.el;
        const self = this;
        this.originalZ = null;

        const handlePress = (evt?: any) => {
          if (evt && evt.stopPropagation) {
            evt.stopPropagation();
          }
          audioService.unlock();
          audioService.playBeep(true);

          // Physical depression animation
          const currentPos = el.getAttribute('position') || { x: 0, y: 0, z: 0 };
          if (self.originalZ === null) {
            self.originalZ = currentPos.z;
          }

          el.setAttribute('animation__press', {
            property: 'position',
            to: `${currentPos.x} ${currentPos.y} ${self.originalZ - 0.04}`,
            dur: 80,
            easing: 'easeInQuad'
          });

          setTimeout(() => {
            el.setAttribute('animation__release', {
              property: 'position',
              to: `${currentPos.x} ${currentPos.y} ${self.originalZ}`,
              dur: 150,
              easing: 'easeOutBack'
            });
          }, 90);

          // Visual highlight
          el.setAttribute('material', 'color: #00E5FF; emissive: #00E5FF; emissiveIntensity: 1.0');
          setTimeout(() => {
            el.setAttribute('material', 'color: #262B33; emissive: #000; emissiveIntensity: 0');
          }, 240);

          // Dispatch event
          window.dispatchEvent(new CustomEvent('sensortech:screen-action', {
            detail: { action: self.data.action, label: self.data.label }
          }));

          if ((window as any).triggerSensorTechAction) {
            (window as any).triggerSensorTechAction(self.data.action, self.data.label);
          }
        };

        el.addEventListener('click', handlePress);
        el.addEventListener('press', handlePress);
        el.addEventListener('triggerdown', handlePress);
        el.addEventListener('mousedown', handlePress);

        // Child click bubbling
        Array.from(el.children).forEach((child: any) => {
          child.addEventListener('click', handlePress);
          child.classList.add('clickable');
        });
      }
    });
  }

  // 5. MACHINE INJECTION & PURGE LEVER COMPONENT
  if (!AFRAME.components['interactive-lever']) {
    AFRAME.registerComponent('interactive-lever', {
      schema: {
        machineId: { type: 'string', default: 'INX-02' }
      },

      init: function () {
        const el = this.el;
        const self = this;
        this.isPulled = false;

        const triggerAction = (evt?: any) => {
          if (evt && evt.stopPropagation) evt.stopPropagation();
          audioService.unlock();
          self.isPulled = !self.isPulled;

          audioService.playLeverPurge();

          // Lever rotation
          const handle = el.querySelector('.lever-handle');
          if (handle) {
            handle.setAttribute('animation', {
              property: 'rotation',
              to: self.isPulled ? '42 0 0' : '0 0 0',
              dur: 280,
              easing: 'easeOutBack'
            });
          }

          // Machine animations
          const machine = el.closest('.machine-unit') || document.querySelector('#machine-INX-02');
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

            const amber = machine.querySelector('.status-beacon-amber');
            const green = machine.querySelector('.status-beacon-green');
            if (amber && green) {
              amber.setAttribute('material', 'color: #FFC107; emissive: #FFC107; emissiveIntensity: 1.0');
              green.setAttribute('material', 'color: #14171C; emissive: #000; emissiveIntensity: 0');
              setTimeout(() => {
                amber.setAttribute('material', 'color: #14171C; emissive: #000; emissiveIntensity: 0');
                green.setAttribute('material', 'color: #22C55E; emissive: #22C55E; emissiveIntensity: 1.0');
              }, 1600);
            }
          }

          window.dispatchEvent(new CustomEvent('sensortech:screen-action', {
            detail: { action: 'purge', label: 'PURGA' }
          }));

          if ((window as any).triggerSensorTechAction) {
            (window as any).triggerSensorTechAction('purge', 'PURGA');
          }
        };

        el.addEventListener('click', triggerAction);
        el.addEventListener('pull', triggerAction);
        el.addEventListener('triggerdown', triggerAction);
        el.addEventListener('mousedown', triggerAction);

        const hitbox = el.querySelector('.lever-hitbox');
        if (hitbox) hitbox.addEventListener('click', triggerAction);
        const handleEl = el.querySelector('.lever-handle');
        if (handleEl) handleEl.addEventListener('click', triggerAction);
      }
    });
  }

  // 6. OVERHEAD CRANE CONTROLLER LEVER
  if (!AFRAME.components['crane-control-lever']) {
    AFRAME.registerComponent('crane-control-lever', {
      init: function () {
        const el = this.el;
        this.isMoved = false;

        const operateCrane = (evt?: any) => {
          if (evt && evt.stopPropagation) evt.stopPropagation();
          audioService.unlock();
          this.isMoved = !this.isMoved;

          audioService.playCraneMove();

          const handle = el.querySelector('.crane-lever-handle');
          if (handle) {
            handle.setAttribute('animation', {
              property: 'rotation',
              to: this.isMoved ? '40 0 0' : '-35 0 0',
              dur: 300,
              easing: 'easeOutQuad'
            });
          }

          const crane = document.querySelector('#overhead-crane') as any;
          if (crane) {
            const targetZ = this.isMoved ? -6 : 3.5;
            crane.setAttribute('animation__move', {
              property: 'position',
              to: `0 7.8 ${targetZ}`,
              dur: 3200,
              easing: 'easeInOutQuad'
            });
          }

          const trolley = document.querySelector('#crane-trolley') as any;
          if (trolley) {
            const targetX = this.isMoved ? 2.8 : -2.8;
            trolley.setAttribute('animation__trolley', {
              property: 'position',
              to: `${targetX} -0.5 0`,
              dur: 3000,
              easing: 'easeInOutQuad'
            });
          }

          window.dispatchEvent(new CustomEvent('sensortech:screen-action', {
            detail: { action: 'move-crane', label: 'PUENTE GRÚA' }
          }));

          if ((window as any).triggerSensorTechAction) {
            (window as any).triggerSensorTechAction('move-crane', 'PUENTE GRÚA');
          }
        };

        el.addEventListener('click', operateCrane);
        el.addEventListener('pull', operateCrane);
        el.addEventListener('triggerdown', operateCrane);
        el.addEventListener('mousedown', operateCrane);

        const hitbox = el.querySelector('.crane-hitbox');
        if (hitbox) hitbox.addEventListener('click', operateCrane);
      }
    });
  }

  // 7. VIRTUAL GUIDE COMPONENT
  if (!AFRAME.components['virtual-guide']) {
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

        if (this.ring1) {
          this.ring1.object3D.rotation.y += 0.025;
          this.ring1.object3D.rotation.z += 0.012;
        }
        if (this.ring2) {
          this.ring2.object3D.rotation.x += 0.035;
          this.ring2.object3D.rotation.y -= 0.018;
        }
        if (this.ring3) {
          this.ring3.object3D.rotation.z -= 0.028;
        }

        if (this.core) {
          this.core.object3D.position.y = Math.sin(this.time * 2.2) * 0.08;
        }
      }
    });
  }

  // 8. FLOOR WAYPOINT COMPONENT
  if (!AFRAME.components['floor-waypoint']) {
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
            rig.setAttribute('animation', {
              property: 'position',
              to: `${self.data.targetX} 0 ${self.data.targetZ}`,
              dur: 800,
              easing: 'easeInOutCubic'
            });
          }

          const guide = document.querySelector('#virtual-guide-entity') as any;
          if (guide) {
            guide.setAttribute('animation', {
              property: 'position',
              to: `${self.data.guideX} 1.6 ${self.data.guideZ}`,
              dur: 1100,
              easing: 'easeInOutQuad'
            });
          }

          setTimeout(() => {
            audioService.speakWaypoint(self.data.pointId);
          }, 500);

          window.dispatchEvent(new CustomEvent('sensortech:waypoint-selected', {
            detail: { pointId: self.data.pointId }
          }));
        };

        el.addEventListener('click', triggerTeleport);
        el.addEventListener('select-waypoint', triggerTeleport);
        el.addEventListener('triggerdown', triggerTeleport);
        el.addEventListener('mousedown', triggerTeleport);
      }
    });
  }
}

// Automatically register immediately if AFRAME is present
if (typeof window !== 'undefined' && (window as any).AFRAME) {
  registerAFrameComponents();
}
