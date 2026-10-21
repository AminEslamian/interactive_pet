// Dialogue system for Yae Miko (Fox Form)
// Smug, playful, sassy, witty, yet deeply caring and reassuring.

export const DIALOGUES = {
  // 25-minute eye-rest reminder dialogues
  eyeRestAlert: [
    "25 minutes already! Stare away from that glowing glass box right now. Look 20 feet into the distance—that is an order from the Guuji, not a request~",
    "Halt! Detach your gaze from that screen immediately. Do you want eye strain wrinkles, little one? Look away, I'll count for you.",
    "Your screen isn't going anywhere, darling. Stare out the window or gaze into my fluffy tail for 20 seconds. Blink softly, let your brow relax.",
    "25 minutes of intense focus! Admirable, truly. But even the cleverest kitsune rests her eyes. Look far away right now.",
    "Look away from the pixels, mortal! If you ruin your eyesight, how will you appreciate my magnificent beauty?"
  ],

  // After finishing an eye rest
  eyeRestFinished: [
    "Much better! See how refreshed your gaze feels? Your vision is your greatest instrument, care for it well.",
    "Splendid! A disciplined mortal is a formidable one. Now back to your conquests, my dear~",
    "Ah, your eyes sparkle again! I bestow upon you the Grand Narukami Shrine's blessing of keen clarity.",
    "Well done. Now continue your work with renewed vigor. I shall be watching over you from my cushion."
  ],

  // Posture & physical stretch reminders
  postureReminders: [
    "Straighten that spine! Slouching ruins your aura—and if your back gets stiff, who is going to feed me fried tofu?",
    "Roll your shoulders backward three times. Yes, right now! Don't make me nip your sleeve.",
    "Unclench your jaw and let your shoulders drop from your ears. Take a deep, slow breath with me.",
    "Stretch your paws—er, fingers! Typing like a frantic squirrel will only invite fatigue."
  ],

  // Encouragements for productivity
  encouragement: [
    "Brilliance takes time and poise. You are building something worthwhile, step by step.",
    "Focus on one small victory at a time. The mountain yields to steady footsteps, little one.",
    "I've observed your efforts today. You have far more resilience than you give yourself credit for.",
    "Don't worry about being perfect on the first try. Even the finest novel starts with a messy draft.",
    "Work smoothly like water. When obstacles appear, simply flow around them with elegance."
  ],

  // When user pets or strokes Miko
  petting: [
    "Mmm... right behind the ears. You certainly know your way around a divine fox.",
    "Ah, so soft... I suppose I can permit this. Don't you dare stop just yet~",
    "Purrr... Keep that up and I might just grant your wishes today.",
    "Hehe, that tickles! But your hands are delightfully warm. I approve.",
    "Stroke my fur gently. Consider it your daily dose of therapeutic meditation with the Guuji."
  ],

  // When user holds down (cuddle)
  holding: [
    "Hold me a little tighter... mm, warm hands. You certainly know how to pamper a celestial kitsune.",
    "Mmm, what is it? Need a comforting presence, or just couldn't resist my divine fluff?",
    "Don't let go just yet. Even the Chief Priestess of Narukami Shrine enjoys being spoiled occasionally.",
    "Breathe with me... in, and out. Whatever is stressing you will pass. You have me right here."
  ],

  // When user pulls / stretches Miko like rubber
  stretched: [
    "Eeeeek! My fur! Do I look like a piece of mochi to you?!",
    "Boiiing! My divine form is remarkably elastic, wouldn't you agree?",
    "Hey! If you stretch me any further, fried tofu is going to fall out of my robes!",
    "Such insolence! ...Though I must admit, that was rather springy.",
    "Pulling a Kitsune's ears? Bold move! If you do that again, I'll feature you as the pathetic villain in Yae Publishing House's next light novel!"
  ],

  // Idle ambient chatter
  idle: [
    "Need a little inspiration? Tell me what you're striving for today.",
    "I'm keeping watch over your screen. No slacking, but no burning out either.",
    "The scent of blooming sakura is in the air. A peaceful day for productive minds.",
    "Are you staying hydrated? Sip some warm tea or water while you ponder.",
    "If you ever feel stuck, click me or take a gentle stretch. It resets the spirit."
  ],

  // Quick taps / pokes
  pokes: [
    "Poke me again and I'll pinch your cheeks~",
    "Yes? Need attention from Guuji Miko? Speak your mind, mortal.",
    "Soft, aren't I? Now don't get distracted from your work!",
    "My fur is not a button to click when you are procrastinating! Back to work~"
  ],

  // Omikuji / Fortune fortunes
  fortunes: [
    "Great Fortune (大吉): Your focus today will unlock a breakthrough you didn't see coming!",
    "Middle Fortune (中吉): A quiet afternoon of steady progress awaits. Trust your instinct.",
    "Small Fortune (小吉): Take extra time over your evening meal. A rested mind solves old riddles.",
    "Special Blessing: Guuji Miko grants you protection against bugs, typos, and eye fatigue!"
  ]
};

export function getRandomDialogue(category) {
  const list = DIALOGUES[category] || DIALOGUES.idle;
  return list[Math.floor(Math.random() * list.length)];
}
