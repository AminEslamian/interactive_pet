import { soundManager } from './sound.js';
import { getRandomDialogue } from './dialogue.js';
import { MikoVideoPet } from './mikoVideoPet.js';

export class MinimalPetRig {
  constructor(containerEl, onTalkCallback) {
    this.container = containerEl;
    this.onTalk = onTalkCallback;

    // Check if running in Electron
    this.isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

    // Default mode: In Electron, start in clean 'dot' mode; in browser, start in 'dot' as well
    this.state = 'dot';
    
    // Hold & Drag State
    this.isHolding = false;
    this.isDragging = false;
    this.pointerDownTime = 0;
    this.startX = 0;
    this.startY = 0;
    this.lastScreenX = 0;
    this.lastScreenY = 0;
    this.hasMovedPastThreshold = false;
    this.holdInterval = null;

    // Auto-minimize stay timer ("stay at least a few seconds after the mouse is gone")
    this.stayTimeout = null;
    this.STAY_DURATION_MS = 4500; // 4.5 seconds

    this.initDOM();
    this.initEngine();
    this.bindEvents();

    // Initialize in dot mode
    this.setMode('dot', false);
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="miko-living-wrapper" id="mikoLivingWrapper">
        
        <!-- Sassy & Playful Speech Bubble -->
        <div class="miko-speech-bubble" id="mikoSpeechBubble">
          <div class="speech-bubble-inner">
            <span class="bubble-text" id="mikoBubbleText">Ah, you called for Guuji Yae? I'm right here~</span>
            <span class="bubble-cursor" id="mikoBubbleCursor"></span>
          </div>
          <div class="speech-tail"></div>
        </div>

        <!-- Entity Stage -->
        <div class="miko-entity-stage" id="mikoEntityStage">
          
          <!-- 1. PURE MINIMAL PINK SAKURA DOT (Clean, not busy, draggable) -->
          <div class="zen-dot-mode" id="zenDotMode" title="Hold to awaken Miko • Drag to reposition">
            <svg class="dot-charge-svg" viewBox="0 0 36 36">
              <circle class="dot-charge-circle" id="dotChargeCircle" cx="18" cy="18" r="14" />
            </svg>
            <div class="pure-pink-dot" id="purePinkDot"></div>
          </div>

          <!-- 2. LIVING MIKO FOX (Revealed on Hold or 25-Min Rest) -->
          <div class="miko-fox-actor" id="mikoFoxActor">
            
            <!-- Hold Charging Radial Indicator for Cuddle -->
            <svg class="fox-hold-ring" viewBox="0 0 84 84">
              <circle class="hold-ring-circle" id="foxHoldRing" cx="42" cy="42" r="38" />
            </svg>

            <!-- Living Animation Canvas -->
            <div class="miko-mesh-container" id="mikoMeshContainer">
              <canvas id="mikoMeshCanvas" class="miko-mesh-canvas"></canvas>
              <div class="miko-cuddle-aura" id="mikoCuddleAura"></div>
            </div>

            <!-- Soft Ground Drop Shadow -->
            <div class="miko-ground-shadow" id="mikoGroundShadow"></div>

            <!-- Desktop Micro Controls (Visible on hover when Miko is awake) -->
            <div class="desktop-pet-controls" id="desktopPetControls">
              <button class="desktop-control-btn" id="btnDesktopSleep" title="Rest into Pink Dot">
                <span>⚪</span> Rest
              </button>
              <button class="desktop-control-btn" id="btnDesktopPat" title="Head Pat">
                <span>🌸</span> Pat
              </button>
            </div>
          </div>

        </div>

        <!-- Floating Sparks & Hearts Stage -->
        <div class="miko-fx-stage" id="mikoFxStage"></div>
      </div>
    `;

    // Cache elements
    this.wrapper = document.getElementById('mikoLivingWrapper');
    this.speechBubble = document.getElementById('mikoSpeechBubble');
    this.bubbleText = document.getElementById('mikoBubbleText');
    this.stage = document.getElementById('mikoEntityStage');
    this.dotMode = document.getElementById('zenDotMode');
    this.purePinkDot = document.getElementById('purePinkDot');
    this.dotChargeCircle = document.getElementById('dotChargeCircle');
    this.foxActor = document.getElementById('mikoFoxActor');
    this.meshContainer = document.getElementById('mikoMeshContainer');
    this.meshCanvas = document.getElementById('mikoMeshCanvas');
    this.cuddleAura = document.getElementById('mikoCuddleAura');
    this.groundShadow = document.getElementById('mikoGroundShadow');
    this.foxHoldRing = document.getElementById('foxHoldRing');
    this.fxStage = document.getElementById('mikoFxStage');
    this.fanLeft = document.getElementById('ambientFanLeft');
    this.fanRight = document.getElementById('ambientFanRight');

    // Dot charge ring circumference: 2 * PI * 14 = 87.96
    this.dotRingCircumference = 2 * Math.PI * 14;
    if (this.dotChargeCircle) {
      this.dotChargeCircle.style.strokeDasharray = `${this.dotRingCircumference}`;
      this.dotChargeCircle.style.strokeDashoffset = `${this.dotRingCircumference}`;
    }

    // Fox ring setup
    this.foxRingCircumference = 2 * Math.PI * 38;
    if (this.foxHoldRing) {
      this.foxHoldRing.style.strokeDasharray = `${this.foxRingCircumference}`;
      this.foxHoldRing.style.strokeDashoffset = `${this.foxRingCircumference}`;
    }

    // Quick desktop action buttons
    const btnDesktopSleep = document.getElementById('btnDesktopSleep');
    if (btnDesktopSleep) {
      btnDesktopSleep.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMode('dot');
      });
    }

    const btnDesktopPat = document.getElementById('btnDesktopPat');
    if (btnDesktopPat) {
      btnDesktopPat.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onHeadPatInteraction();
      });
    }
  }

  initEngine() {
    this.engine = new MikoVideoPet(this.meshCanvas);
  }

  bindEvents() {
    // 1. Mouse gaze & subtle fan parallax
    window.addEventListener('mousemove', (e) => {
      if (this.engine && this.state === 'awake') {
        this.engine.setCursor(e.clientX, e.clientY);
      }

      if (this.fanLeft && this.fanRight && this.state === 'awake') {
        const dx = (e.clientX - window.innerWidth / 2) * 0.012;
        const dy = (e.clientY - window.innerHeight / 2) * 0.012;
        this.fanLeft.style.transform = `translate(${dx}px, ${dy}px) rotate(-12deg)`;
        this.fanRight.style.transform = `translate(${-dx}px, ${dy}px) rotate(14deg)`;
      }
    });

    // 2. Mouse Stay Timer Management on the Fox Actor:
    // "it should stay at least a few seconds after the mouse is gone too"
    this.wrapper.addEventListener('mouseenter', () => {
      if (this.state === 'awake') {
        this.clearStayTimeout();
      }
    });

    this.wrapper.addEventListener('mouseleave', () => {
      if (this.state === 'awake') {
        this.startStayCountdown();
      }
    });

    // 3. Pointer events for DRAG and HOLD on the Dot Mode
    this.dotMode.addEventListener('pointerdown', (e) => this.onDotPointerDown(e));
    
    // 4. Pointer events for Fox Actor
    this.foxActor.addEventListener('pointerdown', (e) => this.onFoxPointerDown(e));

    // 5. Global pointer move & up
    window.addEventListener('pointermove', (e) => this.onGlobalPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onGlobalPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onGlobalPointerUp(e));

    // 6. Speech bubble click
    if (this.speechBubble) {
      this.speechBubble.addEventListener('click', () => {
        this.triggerDialogue(getRandomDialogue('idle'));
        this.resetStayCountdown();
      });
    }

    // 7. Electron Tray Listener
    if (this.isElectron && window.electronAPI.onTrayAction) {
      window.electronAPI.onTrayAction((action) => {
        if (action === 'awaken') {
          this.setMode('awake');
          this.triggerDialogue("Guuji Yae at your service, mortal~");
        } else if (action === 'sleep-dot') {
          this.setMode('dot');
        }
      });
    }
  }

  // ==========================================
  // Dot Pointer & Drag Handling
  // ==========================================
  onDotPointerDown(e) {
    if (e.button !== 0) return; // Left click only
    soundManager.ensureRunning();

    this.isHolding = true;
    this.isDragging = false;
    this.hasMovedPastThreshold = false;
    this.pointerDownTime = performance.now();
    this.startX = e.screenX;
    this.startY = e.screenY;
    this.lastScreenX = e.screenX;
    this.lastScreenY = e.screenY;

    // Start hold charge timer (320ms to summon Miko)
    const HOLD_REQUIRED = 320;
    if (this.holdInterval) clearInterval(this.holdInterval);

    this.holdInterval = setInterval(() => {
      if (!this.isHolding || this.isDragging) {
        clearInterval(this.holdInterval);
        return;
      }

      const elapsed = performance.now() - this.pointerDownTime;
      const progress = Math.min(1, elapsed / HOLD_REQUIRED);

      // Animate delicate golden charge ring around pink dot
      if (this.dotChargeCircle) {
        const offset = this.dotRingCircumference * (1 - progress);
        this.dotChargeCircle.style.strokeDashoffset = `${offset}`;
      }

      if (progress >= 1) {
        clearInterval(this.holdInterval);
        this.onDotHoldComplete();
      }
    }, 16);
  }

  onFoxPointerDown(e) {
    if (e.button !== 0) return;
    this.isHolding = true;
    this.isDragging = false;
    this.hasMovedPastThreshold = false;
    this.pointerDownTime = performance.now();
    this.startX = e.screenX;
    this.startY = e.screenY;
    this.lastScreenX = e.screenX;
    this.lastScreenY = e.screenY;

    this.clearStayTimeout();

    // Fox cuddle hold
    const HOLD_REQUIRED = 550;
    if (this.holdInterval) clearInterval(this.holdInterval);

    this.holdInterval = setInterval(() => {
      if (!this.isHolding || this.isDragging) {
        clearInterval(this.holdInterval);
        return;
      }

      const elapsed = performance.now() - this.pointerDownTime;
      const progress = Math.min(1, elapsed / HOLD_REQUIRED);

      if (this.foxHoldRing) {
        const offset = this.foxRingCircumference * (1 - progress);
        this.foxHoldRing.style.strokeDashoffset = `${offset}`;
      }

      if (progress > 0.3) {
        if (this.engine) this.engine.playReaction();
        if (this.cuddleAura) this.cuddleAura.classList.add('active');
      }

      if (progress >= 1) {
        clearInterval(this.holdInterval);
        this.onFoxHoldComplete();
      }
    }, 16);
  }

  onGlobalPointerMove(e) {
    if (!this.isHolding) return;

    const deltaDist = Math.hypot(e.screenX - this.startX, e.screenY - this.startY);
    if (deltaDist > 4 && !this.hasMovedPastThreshold) {
      // Threshold passed -> It is a DRAG!
      this.hasMovedPastThreshold = true;
      this.isDragging = true;
      if (this.holdInterval) clearInterval(this.holdInterval);

      // Reset charging rings
      if (this.dotChargeCircle) {
        this.dotChargeCircle.style.strokeDashoffset = `${this.dotRingCircumference}`;
      }
      if (this.foxHoldRing) {
        this.foxHoldRing.style.strokeDashoffset = `${this.foxRingCircumference}`;
      }
    }

    if (this.isDragging) {
      const deltaX = e.screenX - this.lastScreenX;
      const deltaY = e.screenY - this.lastScreenY;
      this.lastScreenX = e.screenX;
      this.lastScreenY = e.screenY;

      if (this.isElectron && window.electronAPI.dragWindow) {
        window.electronAPI.dragWindow(deltaX, deltaY);
      }
    }
  }

  onGlobalPointerUp(e) {
    if (!this.isHolding) return;
    this.isHolding = false;
    if (this.holdInterval) clearInterval(this.holdInterval);

    // Reset visual rings
    if (this.dotChargeCircle) {
      this.dotChargeCircle.style.strokeDashoffset = `${this.dotRingCircumference}`;
    }
    if (this.foxHoldRing) {
      this.foxHoldRing.style.strokeDashoffset = `${this.foxRingCircumference}`;
    }
    if (this.cuddleAura) {
      this.cuddleAura.classList.remove('active');
    }

    if (this.isDragging) {
      this.isDragging = false;
      return; // Was dragging, not a tap/hold
    }

    const duration = performance.now() - this.pointerDownTime;
    if (duration < 280) {
      // Quick tap
      if (this.state === 'dot') {
        // Soft pulse hint on dot without noisy audio
        this.purePinkDot.style.transform = 'scale(1.35)';
        setTimeout(() => {
          if (this.purePinkDot) this.purePinkDot.style.transform = '';
        }, 180);
      } else {
        this.onHeadPatInteraction();
      }
    }
  }

  onDotHoldComplete() {
    // Summon Miko!
    soundManager.playCompletionChime();
    this.spawnHearts();
    this.setMode('awake');
    this.triggerDialogue("Ah, you called for Guuji Yae? I'm right here to supervise your work~");
  }

  onFoxHoldComplete() {
    soundManager.playPetPurr();
    this.spawnHearts();
    if (this.engine) this.engine.playReaction();
    this.triggerDialogue(getRandomDialogue('holding'));
    this.resetStayCountdown();
  }

  onHeadPatInteraction() {
    if (this.engine) {
      this.engine.playReaction();
    }
    soundManager.playPetPurr();
    this.triggerDialogue(getRandomDialogue('pokes'));
    this.resetStayCountdown();
  }

  // ==========================================
  // Stay Timer Logic
  // "stay at least a few seconds after the mouse is gone too"
  // ==========================================
  startStayCountdown() {
    this.clearStayTimeout();
    this.stayTimeout = setTimeout(() => {
      if (this.state === 'awake') {
        this.setMode('dot');
      }
    }, this.STAY_DURATION_MS);
  }

  clearStayTimeout() {
    if (this.stayTimeout) {
      clearTimeout(this.stayTimeout);
      this.stayTimeout = null;
    }
  }

  resetStayCountdown() {
    if (this.state === 'awake') {
      this.clearStayTimeout();
      this.startStayCountdown();
    }
  }

  // ==========================================
  // Mode Switching (Dot vs Fox)
  // ==========================================
  setMode(mode, triggerStay = true) {
    this.state = mode;

    if (mode === 'dot') {
      this.clearStayTimeout();
      this.dotMode.style.display = 'flex';
      this.foxActor.style.display = 'none';
      if (this.speechBubble) this.speechBubble.classList.remove('active');

      document.body.classList.add('mode-dot');
      document.body.classList.remove('mode-awake');

      if (this.isElectron && window.electronAPI.setMode) {
        window.electronAPI.setMode('dot');
      }
    } else {
      // Awakening Fox
      this.dotMode.style.display = 'none';
      this.foxActor.style.display = 'flex';

      document.body.classList.add('mode-awake');
      document.body.classList.remove('mode-dot');

      if (this.isElectron && window.electronAPI.setMode) {
        window.electronAPI.setMode('awake');
      }

      if (triggerStay) {
        // Start initial stay countdown so Miko stays for 4.5s even if mouse isn't over her
        this.startStayCountdown();
      }
    }
  }

  doStretchAnimation() {
    this.setMode('awake');
    this.triggerDialogue("Nnngh... stretching paws and fluffing fur! Now it's your turn to stretch, mortal!");
    soundManager.playCompletionChime();
    if (this.engine) {
      this.engine.playReaction();
    }
    this.resetStayCountdown();
  }

  triggerDialogue(text) {
    if (!this.bubbleText || !this.speechBubble) return;

    if (this.typewriterInterval) clearInterval(this.typewriterInterval);

    this.speechBubble.classList.remove('active');
    void this.speechBubble.offsetWidth; // Reflow
    this.speechBubble.classList.add('active');

    this.bubbleText.textContent = '';
    let i = 0;

    // Silent typing without keyboard click or vocal babble
    this.typewriterInterval = setInterval(() => {
      if (i < text.length) {
        this.bubbleText.textContent += text[i];
        i++;
      } else {
        clearInterval(this.typewriterInterval);
      }
    }, 22);

    if (this.onTalk) this.onTalk(text);
  }

  spawnHearts() {
    for (let i = 0; i < 5; i++) {
      const heart = document.createElement('div');
      heart.className = 'miko-sparkle';
      heart.textContent = Math.random() > 0.4 ? '💖' : '🌸';
      heart.style.left = `${45 + (Math.random() - 0.5) * 50}%`;
      heart.style.top = `${45 + (Math.random() - 0.5) * 50}%`;
      this.fxStage.appendChild(heart);
      setTimeout(() => heart.remove(), 1200);
    }
  }

  updateTimerHalo(fraction) {
    // If needed for visual feedback
  }
}
