import { soundManager } from './sound.js';
import { getRandomDialogue } from './dialogue.js';
import { MikoVideoPet } from './mikoVideoPet.js';

export class MinimalPetRig {
  constructor(containerEl, onTalkCallback) {
    this.container = containerEl;
    this.onTalk = onTalkCallback;

    // States: 'awake', 'dot'
    this.state = 'awake';
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdInterval = null;

    this.initDOM();
    this.initEngine();
    this.bindEvents();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="miko-living-wrapper" id="mikoLivingWrapper">
        
        <!-- Sassy & Playful Speech Bubble -->
        <div class="miko-speech-bubble" id="mikoSpeechBubble">
          <div class="speech-bubble-inner">
            <span class="bubble-text" id="mikoBubbleText">Tap me for guidance or hold to rest, mortal~</span>
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
              <img src="./miko_avatar.png" class="spirit-avatar-img" alt="Miko Dot" />
            </div>
            <div class="dot-hover-hint">Hold to reveal Miko</div>
          </div>

          <!-- 2. LIVING MIKO FOX (AI-Generated Movement & Reaction) -->
          <div class="miko-fox-actor" id="mikoFoxActor">
            
            <!-- Hold Charging Radial Indicator -->
            <svg class="fox-hold-ring" viewBox="0 0 200 200">
              <circle class="hold-ring-circle" id="foxHoldRing" cx="100" cy="100" r="92" />
            </svg>

            <!-- Decorative Floating Paper Fans -->
            <div class="ambient-fan fan-left" id="ambientFanLeft">🪭</div>
            <div class="ambient-fan fan-right" id="ambientFanRight">🪭</div>

            <!-- Living Animation Canvas -->
            <div class="miko-mesh-container" id="mikoMeshContainer">
              <canvas id="mikoMeshCanvas" class="miko-mesh-canvas"></canvas>
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
    this.meshContainer = document.getElementById('mikoMeshContainer');
    this.meshCanvas = document.getElementById('mikoMeshCanvas');
    this.cuddleAura = document.getElementById('mikoCuddleAura');
    this.groundShadow = document.getElementById('mikoGroundShadow');
    this.dotHoldProgress = document.getElementById('dotHoldProgress');
    this.dotTimerProgress = document.getElementById('dotTimerProgress');
    this.foxHoldRing = document.getElementById('foxHoldRing');
    this.fxStage = document.getElementById('mikoFxStage');
    this.fanLeft = document.getElementById('ambientFanLeft');
    this.fanRight = document.getElementById('ambientFanRight');

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

  initEngine() {
    this.engine = new MikoVideoPet(this.meshCanvas);
  }

  bindEvents() {
    // Window cursor tracking for subtle gaze tilt & fan parallax
    window.addEventListener('mousemove', (e) => {
      if (this.engine) {
        this.engine.setCursor(e.clientX, e.clientY);
      }

      // Parallax floating fans
      if (this.fanLeft && this.fanRight) {
        const dx = (e.clientX - window.innerWidth / 2) * 0.012;
        const dy = (e.clientY - window.innerHeight / 2) * 0.012;
        this.fanLeft.style.transform = `translate(${dx}px, ${dy}px) rotate(-12deg)`;
        this.fanRight.style.transform = `translate(${-dx}px, ${dy}px) rotate(14deg)`;
      }
    });

    // Touch support for gaze
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (this.engine) {
          this.engine.setCursor(touch.clientX, touch.clientY);
        }
      }
    }, { passive: true });

    // Press & Hold on Stage
    this.stage.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.startHold();
    });

    this.stage.addEventListener('touchstart', (e) => {
      this.startHold();
    }, { passive: true });

    // Release Hold
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

  startHold() {
    this.isHolding = true;
    this.holdStartTime = performance.now();
    soundManager.ensureRunning();

    if (this.holdInterval) clearInterval(this.holdInterval);
    const holdRequired = this.state === 'dot' ? 380 : 650;

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
          if (this.engine) this.engine.playReaction();
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

    if (this.holdInterval) clearInterval(this.holdInterval);

    // Reset hold rings
    if (this.dotHoldProgress) this.dotHoldProgress.style.strokeDashoffset = `${this.dotRingCircumference}`;
    if (this.foxHoldRing) this.foxHoldRing.style.strokeDashoffset = `${this.foxRingCircumference}`;
    if (this.cuddleAura) this.cuddleAura.classList.remove('active');

    const duration = performance.now() - this.holdStartTime;

    // Quick tap
    if (duration < 280) {
      this.onQuickTap();
    } else {
      // Releasing after hold: let reaction conclude
      if (this.engine) {
        this.engine.stopReaction();
      }
    }
  }

  onHoldComplete() {
    soundManager.playPetPurr();
    this.spawnHearts();

    if (this.state === 'dot') {
      this.setMode('awake');
      this.triggerDialogue("Ah, you called for Guuji Yae? I'm right here to supervise your work~");
    } else {
      if (this.engine) this.engine.playReaction();
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
      if (this.engine) {
        this.engine.playReaction();
      }
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
      this.foxActor.style.display = 'flex';
    }
  }

  // Play animation on stretch / advice
  doStretchAnimation() {
    this.setMode('awake');
    this.triggerDialogue("Nnngh... stretching paws and fluffing fur! Now it's your turn to stretch, mortal!");
    soundManager.playCompletionChime();
    if (this.engine) {
      this.engine.playReaction();
    }
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
    if (!this.dotTimerProgress) return;
    const offset = this.timerCircumference * (1 - fraction);
    this.dotTimerProgress.style.strokeDashoffset = `${offset}`;
  }
}
