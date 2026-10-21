import { soundManager } from './sound.js';
import { getRandomDialogue } from './dialogue.js';

export class MinimalPetRig {
  constructor(containerEl, onTalkCallback) {
    this.container = containerEl;
    this.onTalk = onTalkCallback;

    // States: 'awake', 'dot'
    this.state = 'awake';
    this.expression = 'normal'; // 'normal', 'happy'
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdInterval = null;

    // Movement & Dragging (Squash & Stretch)
    this.isDragging = false;
    this.hasMoved = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.velScaleX = 0;
    this.velScaleY = 0;
    this.posX = 0;
    this.posY = 0;

    // Gaze tracking & tilt
    this.cursorX = window.innerWidth / 2;
    this.cursorY = window.innerHeight / 2;
    this.headTilt = 0;
    this.breath = 0;

    // Blinking timer
    this.blinkTimer = 0;
    this.isBlinking = false;

    this.initDOM();
    this.bindEvents();
    this.startLoop();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="miko-living-wrapper" id="mikoLivingWrapper">
        
        <!-- Sassy & Teasing Speech Bubble -->
        <div class="miko-speech-bubble" id="mikoSpeechBubble">
          <div class="speech-bubble-inner">
            <span class="bubble-text" id="mikoBubbleText">Tap or hold me to start our day~</span>
            <span class="bubble-cursor" id="mikoBubbleCursor"></span>
          </div>
          <div class="speech-tail"></div>
        </div>

        <!-- Entity Stage -->
        <div class="miko-entity-stage" id="mikoEntityStage">
          
          <!-- 1. MINIMAL ZEN DOT (Spirit Flame for Desktop) -->
          <div class="zen-dot-mode" id="zenDotMode" title="Hold to awaken Miko">
            <svg class="dot-ring-svg" viewBox="0 0 100 100">
              <circle class="dot-halo-bg" cx="50" cy="50" r="42" />
              <circle class="dot-timer-progress" id="dotTimerProgress" cx="50" cy="50" r="42" />
              <circle class="dot-hold-progress" id="dotHoldProgress" cx="50" cy="50" r="46" />
            </svg>
            <div class="spirit-core">
              <div class="spirit-glow"></div>
              <span class="spirit-icon">🦊</span>
            </div>
            <div class="dot-hover-hint">Hold to reveal</div>
          </div>

          <!-- 2. AUTHENTIC LIVING MIKO FOX -->
          <div class="miko-fox-actor" id="mikoFoxActor">
            
            <!-- Hold Charging Radial Indicator -->
            <svg class="fox-hold-ring" viewBox="0 0 200 200">
              <circle class="hold-ring-circle" id="foxHoldRing" cx="100" cy="100" r="92" />
            </svg>

            <!-- Fox Image Layers (Normal & Happy/Blink) -->
            <div class="miko-sprite-container" id="mikoSpriteContainer">
              <img src="./miko_fox_cutout.png" alt="Yae Miko Fox" class="miko-fox-img normal active" id="mikoImgNormal" />
              <img src="./miko_fox_happy.png" alt="Yae Miko Fox Happy" class="miko-fox-img happy" id="mikoImgHappy" />
              <div class="miko-cuddle-aura" id="mikoCuddleAura"></div>
            </div>

            <!-- Soft Ground Drop Shadow -->
            <div class="miko-ground-shadow" id="mikoGroundShadow"></div>
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
    this.foxActor = document.getElementById('mikoFoxActor');
    this.spriteContainer = document.getElementById('mikoSpriteContainer');
    this.imgNormal = document.getElementById('mikoImgNormal');
    this.imgHappy = document.getElementById('mikoImgHappy');
    this.cuddleAura = document.getElementById('mikoCuddleAura');
    this.groundShadow = document.getElementById('mikoGroundShadow');
    this.dotHoldProgress = document.getElementById('dotHoldProgress');
    this.dotTimerProgress = document.getElementById('dotTimerProgress');
    this.foxHoldRing = document.getElementById('foxHoldRing');
    this.fxStage = document.getElementById('mikoFxStage');

    // Ring stroke setup
    this.dotRingCircumference = 2 * Math.PI * 46;
    if (this.dotHoldProgress) {
      this.dotHoldProgress.style.strokeDasharray = `${this.dotRingCircumference}`;
      this.dotHoldProgress.style.strokeDashoffset = `${this.dotRingCircumference}`;
    }

    this.timerCircumference = 2 * Math.PI * 42;
    if (this.dotTimerProgress) {
      this.dotTimerProgress.style.strokeDasharray = `${this.timerCircumference}`;
      this.dotTimerProgress.style.strokeDashoffset = '0';
    }

    this.foxRingCircumference = 2 * Math.PI * 92;
    if (this.foxHoldRing) {
      this.foxHoldRing.style.strokeDasharray = `${this.foxRingCircumference}`;
      this.foxHoldRing.style.strokeDashoffset = `${this.foxRingCircumference}`;
    }
  }

  bindEvents() {
    // Window cursor tracking for head tilt
    window.addEventListener('mousemove', (e) => {
      this.cursorX = e.clientX;
      this.cursorY = e.clientY;

      if (this.isDragging && this.state === 'awake') {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        if (Math.hypot(dx, dy) > 8) {
          this.hasMoved = true;
        }

        // Elastic volume-preserving stretch
        const stretchAmount = -dy * 0.0035;
        this.scaleY = Math.max(0.65, Math.min(1.65, 1 + stretchAmount));
        this.scaleX = 1 / Math.sqrt(this.scaleY);
        this.posX = dx * 0.45;
        this.posY = dy * 0.45;
      }
    });

    // Touch support
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.cursorX = touch.clientX;
        this.cursorY = touch.clientY;

        if (this.isDragging && this.state === 'awake') {
          const dx = touch.clientX - this.dragStartX;
          const dy = touch.clientY - this.dragStartY;
          if (Math.hypot(dx, dy) > 8) this.hasMoved = true;
          this.scaleY = Math.max(0.65, Math.min(1.65, 1 + -dy * 0.0035));
          this.scaleX = 1 / Math.sqrt(this.scaleY);
          this.posX = dx * 0.45;
          this.posY = dy * 0.45;
        }
      }
    }, { passive: true });

    // Press & Hold on Stage
    this.stage.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.startHold(e.clientX, e.clientY);
    });

    this.stage.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.startHold(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    // Release Hold / Drag
    window.addEventListener('mouseup', () => this.endHold());
    window.addEventListener('touchend', () => this.endHold());

    // Speech bubble click
    this.speechBubble.addEventListener('click', () => {
      this.triggerDialogue(getRandomDialogue('idle'));
    });

    // Double-click to toggle Dot / Fox
    this.stage.addEventListener('dblclick', () => {
      this.toggleMode();
    });
  }

  startHold(clientX, clientY) {
    this.isHolding = true;
    this.isDragging = true;
    this.hasMoved = false;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.holdStartTime = performance.now();
    soundManager.ensureRunning();

    if (this.holdInterval) clearInterval(this.holdInterval);
    const holdRequired = this.state === 'dot' ? 380 : 700;

    this.holdInterval = setInterval(() => {
      if (!this.isHolding) {
        clearInterval(this.holdInterval);
        return;
      }

      const elapsed = performance.now() - this.holdStartTime;
      const progress = Math.min(1, elapsed / holdRequired);

      // Update hold rings
      if (this.state === 'dot') {
        const offset = this.dotRingCircumference * (1 - progress);
        if (this.dotHoldProgress) this.dotHoldProgress.style.strokeDashoffset = `${offset}`;
      } else {
        const offset = this.foxRingCircumference * (1 - progress);
        if (this.foxHoldRing) this.foxHoldRing.style.strokeDashoffset = `${offset}`;

        // Soft cuddle reaction while holding
        if (progress > 0.25) {
          this.setExpression('happy');
          if (this.cuddleAura) this.cuddleAura.classList.add('active');
        }
      }

      // Threshold reached!
      if (progress >= 1) {
        clearInterval(this.holdInterval);
        this.onHoldComplete();
      }
    }, 16);
  }

  endHold() {
    if (!this.isHolding) return;
    this.isHolding = false;
    this.isDragging = false;

    if (this.holdInterval) clearInterval(this.holdInterval);

    // Reset hold rings
    if (this.dotHoldProgress) this.dotHoldProgress.style.strokeDashoffset = `${this.dotRingCircumference}`;
    if (this.foxHoldRing) this.foxHoldRing.style.strokeDashoffset = `${this.foxRingCircumference}`;
    if (this.cuddleAura) this.cuddleAura.classList.remove('active');

    const duration = performance.now() - this.holdStartTime;

    // Reset happy expression after delay
    setTimeout(() => {
      if (!this.isHolding && !this.isBlinking) {
        this.setExpression('normal');
      }
    }, 1200);

    // Quick tap
    if (!this.hasMoved && duration < 320) {
      this.onQuickTap();
    } else if (this.hasMoved) {
      // Released after stretch: play boing!
      const tension = Math.abs(this.scaleY - 1);
      soundManager.playStretchBoing(tension);
      if (tension > 0.2) {
        this.triggerDialogue(getRandomDialogue('stretched'));
      }
    }
  }

  onHoldComplete() {
    soundManager.playPetPurr();
    this.spawnHearts();

    if (this.state === 'dot') {
      this.setMode('awake');
      this.triggerDialogue("Ah, you called for Guuji Yae? I'm right here to watch over you~");
    } else {
      this.triggerDialogue(getRandomDialogue('holding'));
      soundManager.playCompletionChime();
    }
  }

  onQuickTap() {
    if (this.state === 'dot') {
      this.triggerDialogue("Hold me down to reveal Miko, or double-click to awaken.");
      soundManager.playBabble(1.2);
    } else {
      soundManager.playBabble(1.0);
      this.setExpression('happy');
      setTimeout(() => this.setExpression('normal'), 600);
      this.triggerDialogue(getRandomDialogue('pokes'));
    }
  }

  toggleMode() {
    if (this.state === 'dot') {
      this.setMode('awake');
      this.triggerDialogue("Miko reveals herself. Back to business, mortal~");
    } else {
      this.setMode('dot');
      this.triggerDialogue("Resting into a minimal spirit flame. Hold me anytime.");
    }
  }

  setMode(mode) {
    this.state = mode;
    if (mode === 'dot') {
      this.dotMode.style.display = 'flex';
      this.foxActor.style.display = 'none';
    } else {
      this.dotMode.style.display = 'none';
      this.foxActor.style.display = 'block';
    }
  }

  setExpression(expr) {
    this.expression = expr;
    if (expr === 'happy') {
      this.imgNormal.classList.remove('active');
      this.imgHappy.classList.add('active');
    } else {
      this.imgHappy.classList.remove('active');
      this.imgNormal.classList.add('active');
    }
  }

  // Cute Full Stretch Animation
  doStretchAnimation() {
    this.setMode('awake');
    this.triggerDialogue("Nnngh... stretch those front paws! Mmm, that feels wonderful. Now it's your turn, mortal!");
    soundManager.playStretchBoing(0.8);
    this.setExpression('happy');

    const startTime = performance.now();
    const duration = 2400;

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      // Bow and arch spine curve
      const p = Math.sin(t * Math.PI);
      this.scaleY = 1 + p * 0.22;
      this.scaleX = 1 - p * 0.12;
      this.posY = -p * 20;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        this.setExpression('normal');
      }
    };
    requestAnimationFrame(step);
  }

  // Typewriter dialogue display
  triggerDialogue(text) {
    if (!this.bubbleText || !this.speechBubble) return;

    if (this.typewriterInterval) clearInterval(this.typewriterInterval);

    this.speechBubble.classList.remove('active');
    void this.speechBubble.offsetWidth; // Reflow
    this.speechBubble.classList.add('active');

    this.bubbleText.textContent = '';
    let i = 0;

    soundManager.speakText(text);

    this.typewriterInterval = setInterval(() => {
      if (i < text.length) {
        this.bubbleText.textContent += text[i];
        if (i % 2 === 0 && /[a-zA-Z]/.test(text[i])) {
          soundManager.playBabble();
        }
        i++;
      } else {
        clearInterval(this.typewriterInterval);
      }
    }, 28);

    if (this.onTalk) this.onTalk(text);
  }

  spawnHearts() {
    for (let i = 0; i < 4; i++) {
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
    if (!this.dotTimerProgress) return;
    const offset = this.timerCircumference * (1 - fraction);
    this.dotTimerProgress.style.strokeDashoffset = `${offset}`;
  }

  // Smooth 60 FPS Animation Loop
  startLoop() {
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // 1. Organic Breathing Rhythm
      this.breath = Math.sin(now * 0.0022) * 3;

      // 2. Spring Recovery for Squash & Stretch
      if (!this.isDragging) {
        const k = 160;
        const d = 12;
        const fY = (1.0 - this.scaleY) * k - this.velScaleY * d;
        this.velScaleY += fY * dt;
        this.scaleY += this.velScaleY * dt;

        const fX = (1.0 - this.scaleX) * k - this.velScaleX * d;
        this.velScaleX += fX * dt;
        this.scaleX += this.velScaleX * dt;

        this.posX += (0 - this.posX) * 10 * dt;
        this.posY += (0 - this.posY) * 10 * dt;
      }

      // 3. Subtle Head Tilt toward Cursor
      if (this.foxActor) {
        const rect = this.foxActor.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height * 0.4;
        const angleToMouse = Math.atan2(this.cursorY - centerY, this.cursorX - centerX);
        const targetTilt = Math.max(-5, Math.min(5, (angleToMouse - Math.PI / 2) * (180 / Math.PI) * 0.08));
        this.headTilt += (targetTilt - this.headTilt) * 6 * dt;

        // Apply transforms
        const effectiveY = this.posY + this.breath;
        this.spriteContainer.style.transform = `
          translate(${this.posX}px, ${effectiveY}px)
          scale(${this.scaleX}, ${this.scaleY})
          rotate(${this.headTilt}deg)
        `;

        if (this.groundShadow) {
          const shadowScale = (1.8 - this.scaleY) * 0.85;
          this.groundShadow.style.transform = `scale(${shadowScale}, 0.85)`;
        }
      }

      // 4. Natural Blinking Cycle
      this.blinkTimer += dt;
      if (!this.isBlinking && this.blinkTimer > 3.6 + Math.random() * 2.5) {
        this.isBlinking = true;
        this.blinkTimer = 0;
        if (this.expression === 'normal') {
          this.setExpression('happy');
          setTimeout(() => {
            if (this.expression === 'happy' && !this.isHolding) {
              this.setExpression('normal');
            }
            this.isBlinking = false;
          }, 140);
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
