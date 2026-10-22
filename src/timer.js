import { soundManager } from './sound.js';
import { getRandomDialogue } from './dialogue.js';
import confetti from 'canvas-confetti';

export class TimerManager {
  constructor(petRigInstance) {
    this.pet = petRigInstance;

    this.MODES = {
      focus: { name: '25m Eye-Rest', duration: 25 * 60 },
      break: { name: '5m Rest', duration: 5 * 60 },
      quick: { name: '20s Quick Eyes', duration: 20 }
    };

    this.currentMode = 'focus';
    this.totalSeconds = this.MODES[this.currentMode].duration;
    this.remainingSeconds = this.totalSeconds;
    this.isRunning = true;
    this.timerInterval = null;

    this.stats = {
      sessionsCompleted: parseInt(localStorage.getItem('miko_sessions') || '0', 10),
      eyeBreaksTaken: parseInt(localStorage.getItem('miko_breaks') || '0', 10)
    };

    this.isExerciseActive = false;
    this.exerciseTimer = null;
    this.exerciseSeconds = 20;

    this.initDOM();
    this.bindEvents();
    this.start();
    this.updateDisplay();
  }

  initDOM() {
    const dockContainer = document.getElementById('timerDock');
    if (!dockContainer) return;

    dockContainer.innerHTML = `
      <!-- Minimal Zen Focus Bar -->
      <div class="zen-timer-bar" id="zenTimerBar">
        
        <!-- Focus Progress Pill -->
        <div class="timer-time-pill" id="timerPill">
          <span class="timer-status-dot"></span>
          <span class="timer-digits" id="timerDigits">25:00</span>
          <span class="timer-mode-name" id="timerModeName">Focus</span>
        </div>

        <!-- Minimal Quick Controls -->
        <div class="zen-bar-actions">
          <button class="zen-btn icon-only" id="btnToggleTimer" title="Pause / Resume">
            <span id="timerPlayIcon">⏸</span>
          </button>
          <button class="zen-btn icon-only" id="btnResetTimer" title="Reset Cycle">
            ↺
          </button>
          <button class="zen-btn text-btn" id="btnTestRest" title="Experience 25m Eye Rest Alert Now">
            ⚡ Test Rest
          </button>
        </div>

        <!-- Mode Dropdown / Switcher -->
        <div class="zen-mode-selector">
          <button class="zen-btn-mode active" data-mode="focus">25m</button>
          <button class="zen-btn-mode" data-mode="break">5m</button>
          <button class="zen-btn-mode" data-mode="quick">20s</button>
        </div>
      </div>
    `;

    this.timerDigits = document.getElementById('timerDigits');
    this.timerModeName = document.getElementById('timerModeName');
    this.btnToggleTimer = document.getElementById('btnToggleTimer');
    this.btnResetTimer = document.getElementById('btnResetTimer');
    this.btnTestRest = document.getElementById('btnTestRest');
    this.timerPlayIcon = document.getElementById('timerPlayIcon');
    this.modeButtons = document.querySelectorAll('.zen-btn-mode');

    // Ritual overlay elements from document body
    this.eyeOverlay = document.getElementById('zenEyeOverlay');
    this.ritualTitle = document.getElementById('ritualTitle');
    this.ritualSubtitle = document.getElementById('ritualSubtitle');
    this.ritualCountdown = document.getElementById('ritualCountdown');
    this.ambientEyeOrb = document.getElementById('ambientEyeOrb');
    this.btnFinishRitual = document.getElementById('btnFinishRitual');
  }

  bindEvents() {
    this.btnToggleTimer.addEventListener('click', () => this.toggle());
    this.btnResetTimer.addEventListener('click', () => this.reset());
    this.btnTestRest.addEventListener('click', () => this.triggerEyeRestAlert());

    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    if (this.btnFinishRitual) {
      this.btnFinishRitual.addEventListener('click', () => {
        this.finishExerciseSuccess();
      });
    }
  }

  setMode(mode) {
    if (!this.MODES[mode]) return;
    this.currentMode = mode;
    this.totalSeconds = this.MODES[mode].duration;
    this.remainingSeconds = this.totalSeconds;
    this.pause();

    this.modeButtons.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });

    this.timerModeName.textContent = mode === 'focus' ? 'Focus' : mode === 'break' ? 'Break' : 'Quick';
    this.updateDisplay();
  }

  toggle() {
    soundManager.ensureRunning();
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    this.isRunning = true;
    this.timerPlayIcon.textContent = '⏸';
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateDisplay();
      } else {
        this.completed();
      }
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    this.timerPlayIcon.textContent = '▶';
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  reset() {
    this.pause();
    this.remainingSeconds = this.totalSeconds;
    this.updateDisplay();
  }

  updateDisplay() {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    this.timerDigits.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const fraction = (this.totalSeconds - this.remainingSeconds) / this.totalSeconds;
    if (this.pet && this.pet.updateTimerHalo) {
      this.pet.updateTimerHalo(fraction);
    }
  }

  completed() {
    this.pause();
    if (this.currentMode === 'focus') {
      this.stats.sessionsCompleted++;
      localStorage.setItem('miko_sessions', this.stats.sessionsCompleted);
    }
    this.triggerEyeRestAlert();
  }

  triggerEyeRestAlert() {
    soundManager.playRestChime();

    this.pet.setMode('awake');
    this.pet.triggerDialogue(getRandomDialogue('eyeRestAlert'));
    this.pet.doStretchAnimation();

    this.openRitual();
  }

  openRitual() {
    if (!this.eyeOverlay) return;
    this.isExerciseActive = true;
    this.eyeOverlay.classList.add('visible');
    this.exerciseSeconds = 20;
    this.ritualCountdown.textContent = `${this.exerciseSeconds}s`;

    this.ritualTitle.textContent = '1. Look 20 Feet Away';
    this.ritualSubtitle.textContent = 'Look across the room or out a window. Relax your brow and facial muscles.';

    this.animateOrb();

    if (this.exerciseTimer) clearInterval(this.exerciseTimer);

    this.exerciseTimer = setInterval(() => {
      this.exerciseSeconds--;
      this.ritualCountdown.textContent = `${this.exerciseSeconds}s`;

      if (this.exerciseSeconds === 13) {
        this.ritualTitle.textContent = '2. Trace the Glowing Petal';
        this.ritualSubtitle.textContent = 'Softly follow the soothing motion with your gaze without turning your head.';
      } else if (this.exerciseSeconds === 6) {
        this.ritualTitle.textContent = '3. Deep Breath & Soft Blink';
        this.ritualSubtitle.textContent = 'Inhale peace, exhale tension. Let your shoulders drop away from your ears.';
      } else if (this.exerciseSeconds <= 0) {
        this.finishExerciseSuccess();
      }
    }, 1000);
  }

  animateOrb() {
    const start = performance.now();
    const frame = (time) => {
      if (!this.isExerciseActive) return;
      const t = (time - start) / 1000;
      const x = Math.sin(t * 1.2) * 120;
      const y = Math.sin(t * 2.4) * 35;
      if (this.ambientEyeOrb) {
        this.ambientEyeOrb.style.transform = `translate(${x}px, ${y}px)`;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  finishExerciseSuccess() {
    if (this.exerciseTimer) clearInterval(this.exerciseTimer);
    this.isExerciseActive = false;
    if (this.eyeOverlay) this.eyeOverlay.classList.remove('visible');

    this.stats.eyeBreaksTaken++;
    localStorage.setItem('miko_breaks', this.stats.eyeBreaksTaken);

    soundManager.playCompletionChime();

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#fed1d6', '#f6d365', '#d896ec', '#ffffff']
      });
    } catch {}

    this.pet.triggerDialogue(getRandomDialogue('eyeRestFinished'));
    if (this.pet.startStayCountdown) {
      this.pet.startStayCountdown();
    }
    this.setMode('focus');
    this.start();
  }
}
