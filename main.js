import './index.css';
import { MinimalPetRig } from './src/petRig.js';
import { TimerManager } from './src/timer.js';
import { SakuraPetals } from './src/particles.js';
import { soundManager } from './src/sound.js';
import { getRandomDialogue } from './src/dialogue.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Gentle background sakura petals
  const bgCanvas = document.getElementById('sakuraCanvas');
  new SakuraPetals(bgCanvas);

  // 2. Initialize Minimal Pet Rig
  const petContainer = document.getElementById('petStage');
  const pet = new MinimalPetRig(petContainer, (dialogueText) => {
    // Dialogue hook
  });

  // 3. Initialize 25-minute Pomodoro & Eye-rest Manager
  const timer = new TimerManager(pet);

  // 4. Header View Mode Switchers
  const btnSwitchDot = document.getElementById('btnSwitchDot');
  const btnSwitchFox = document.getElementById('btnSwitchFox');

  const updateModeButtons = (mode) => {
    btnSwitchDot.classList.toggle('active', mode === 'dot');
    btnSwitchFox.classList.toggle('active', mode !== 'dot');
  };

  btnSwitchDot.addEventListener('click', () => {
    pet.setMode('dot');
    updateModeButtons('dot');
  });

  btnSwitchFox.addEventListener('click', () => {
    pet.setMode('awake');
    updateModeButtons('awake');
  });

  // 5. Audio & Voice Toggles
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  soundToggleBtn.addEventListener('click', () => {
    soundManager.initAudioContext();
    const isMuted = soundManager.toggleMute();
    soundToggleBtn.classList.toggle('muted', isMuted);
    soundToggleBtn.querySelector('.tool-label').textContent = isMuted ? 'Sound Off' : 'Sound On';
  });

  const ttsToggleBtn = document.getElementById('ttsToggleBtn');
  ttsToggleBtn.addEventListener('click', () => {
    const isTTS = soundManager.toggleTTS();
    ttsToggleBtn.classList.toggle('active', isTTS);
    ttsToggleBtn.querySelector('.tool-label').textContent = isTTS ? 'Voice: ON' : 'Voice: OFF';
    if (isTTS) {
      soundManager.speakText("Peaceful presence enabled. I shall speak gently now.");
    }
  });

  // 6. Action Bar Pills
  const btnStretch = document.getElementById('btnStretchTogether');
  btnStretch.addEventListener('click', () => {
    pet.doStretchAnimation();
  });

  const btnAdvice = document.getElementById('btnAskAdvice');
  btnAdvice.addEventListener('click', () => {
    pet.triggerDialogue(getRandomDialogue('encouragement'));
  });

  const btnPosture = document.getElementById('btnCheckPosture');
  btnPosture.addEventListener('click', () => {
    pet.triggerDialogue(getRandomDialogue('postureReminders'));
  });

  const btnCurlSleep = document.getElementById('btnCurlSleep');
  btnCurlSleep.addEventListener('click', () => {
    pet.setMode('dot');
    pet.triggerDialogue("Yaaawn... Guuji Yae requires her sacred beauty nap. Hold my spirit flame whenever you need me~");
    updateModeButtons('dot');
  });

  // Welcome greeting
  setTimeout(() => {
    pet.triggerDialogue("Ah, you're finally here, little one! Guuji Yae is ready to supervise your work today. Don't you dare slack off~");
  }, 800);
});
