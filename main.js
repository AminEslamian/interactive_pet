import './index.css';
import { MinimalPetRig } from './src/petRig.js';
import { TimerManager } from './src/timer.js';
import { SakuraPetals } from './src/particles.js';
import { soundManager } from './src/sound.js';
import { getRandomDialogue } from './src/dialogue.js';

document.addEventListener('DOMContentLoaded', () => {
  const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

  if (isElectron) {
    document.documentElement.classList.add('electron-app');
    document.body.classList.add('electron-desktop-mode');
  }

  // 1. Background sakura petals (for browser view)
  const bgCanvas = document.getElementById('sakuraCanvas');
  if (bgCanvas && !isElectron) {
    new SakuraPetals(bgCanvas);
  }

  // 2. Initialize Minimal Pet Rig
  const petContainer = document.getElementById('petStage');
  const pet = new MinimalPetRig(petContainer, (dialogueText) => {
    // Dialogue hook
  });

  // 3. Initialize 25-minute Pomodoro & Eye-rest Manager
  const timer = new TimerManager(pet);

  // 4. Header View Mode Switchers (in browser layout)
  const btnSwitchDot = document.getElementById('btnSwitchDot');
  const btnSwitchFox = document.getElementById('btnSwitchFox');

  const updateModeButtons = (mode) => {
    if (btnSwitchDot) btnSwitchDot.classList.toggle('active', mode === 'dot');
    if (btnSwitchFox) btnSwitchFox.classList.toggle('active', mode !== 'dot');
  };

  if (btnSwitchDot) {
    btnSwitchDot.addEventListener('click', () => {
      pet.setMode('dot');
      updateModeButtons('dot');
    });
  }

  if (btnSwitchFox) {
    btnSwitchFox.addEventListener('click', () => {
      pet.setMode('awake');
      updateModeButtons('awake');
    });
  }

  // 5. Audio & Voice Toggles
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundManager.initAudioContext();
      const isMuted = soundManager.toggleMute();
      soundToggleBtn.classList.toggle('muted', isMuted);
      soundToggleBtn.querySelector('.tool-label').textContent = isMuted ? 'Sound Off' : 'Sound On';
    });
  }

  const ttsToggleBtn = document.getElementById('ttsToggleBtn');
  if (ttsToggleBtn) {
    ttsToggleBtn.addEventListener('click', () => {
      const isTTS = soundManager.toggleTTS();
      ttsToggleBtn.classList.toggle('active', isTTS);
      ttsToggleBtn.querySelector('.tool-label').textContent = isTTS ? 'Voice: ON' : 'Voice: OFF';
      if (isTTS) {
        soundManager.speakText("Peaceful presence enabled. I shall speak gently now.");
      }
    });
  }

  // 6. Action Bar Pills (Browser view)
  const btnStretch = document.getElementById('btnStretchTogether');
  if (btnStretch) {
    btnStretch.addEventListener('click', () => {
      pet.doStretchAnimation();
    });
  }

  const btnAdvice = document.getElementById('btnAskAdvice');
  if (btnAdvice) {
    btnAdvice.addEventListener('click', () => {
      pet.setMode('awake');
      pet.triggerDialogue(getRandomDialogue('encouragement'));
    });
  }

  const btnPosture = document.getElementById('btnCheckPosture');
  if (btnPosture) {
    btnPosture.addEventListener('click', () => {
      pet.setMode('awake');
      pet.triggerDialogue(getRandomDialogue('postureReminders'));
    });
  }

  const btnCurlSleep = document.getElementById('btnCurlSleep');
  if (btnCurlSleep) {
    btnCurlSleep.addEventListener('click', () => {
      pet.setMode('dot');
      updateModeButtons('dot');
    });
  }

  // 7. Tray interaction hook
  if (isElectron && window.electronAPI.onTrayAction) {
    window.electronAPI.onTrayAction((action) => {
      if (action === 'reset-timer') {
        timer.reset();
        timer.start();
      }
    });
  }

  // Default mode state
  pet.setMode('dot', false);
  updateModeButtons('dot');
});
