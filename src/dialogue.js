// Authentic Dialogue System for Yae Miko (Fox Form)
// Sassy, teasing, playful, smug, yet deeply caring and utterly charming.
// Strictly in-character as the Guuji of Grand Narukami Shrine & Editor-in-Chief of Yae Publishing House.

export const DIALOGUES = {
  // 25-minute eye-rest reminder alerts (Imperious, teasing, caring)
  eyeRestAlert: [
    "25 minutes already! Stare away from that glowing glass box right now. Look 20 feet into the distance—that is an order from the Guuji, not a request~",
    "Halt! Detach your gaze from that screen immediately. If your eyesight fails, how will you admire my sublime fluff, little one?",
    "Your screen isn't going anywhere, darling. Stare out the window or gaze into my fluffy tail for 20 seconds. Blink softly, let your brow relax.",
    "Look away from the pixels, mortal! Staring unblinkingly gives you frown lines. Rest your eyes right now, I'll count the seconds for you.",
    "25 minutes of intense focus! Admirable, truly. But even the cleverest kitsune rests her eyes. Gaze far into the horizon this instant~",
    "Tsk tsk. Look at those strained eyes. Rest them now, or I shall have lightning strike your router!"
  ],

  // After finishing an eye rest
  eyeRestFinished: [
    "Much better! See how refreshed your gaze feels? Your vision is your greatest instrument, care for it well.",
    "Splendid! A disciplined mortal is a formidable one. Now back to your conquests, my dear~",
    "Ah, your eyes sparkle again! I bestow upon you the Grand Narukami Shrine's sacred blessing of keen clarity.",
    "Well done. Now continue your work with renewed vigor. I shall be watching over you from my cushion.",
    "Mmm, good mortal. That wasn't so painful, was it? Now resume your craft with a clearer mind."
  ],

  // Posture & physical stretch reminders
  postureReminders: [
    "Straighten that spine! Slouching ruins your aura—and if your back gets stiff, who is going to feed me fried tofu?",
    "Roll your shoulders backward three times. Yes, right now! Don't make me nip your sleeve, darling.",
    "Unclench your jaw and let your shoulders drop from your ears. Take a deep, slow breath with me... in, and out.",
    "Hunching like a sleepy old tengu again? Straighten up before I cast a minor illusion on your monitor!",
    "Stretch your paws—er, fingers! Typing like a frantic squirrel will only invite fatigue."
  ],

  // Witty & playful encouragement (Authentic Yae Miko - no boring corporate text!)
  encouragement: [
    "My my, look at you working so diligently! Are you trying to impress me? Hehe... well, keep going, it might just work.",
    "Still staring at that blank editor, little one? Even the worst light novel writer in Inazuma drafts faster than this~",
    "Don't let mortal frustration cloud your wits. You're far cleverer than you think—I wouldn't grace an ordinary mortal with my company, after all.",
    "Need inspiration? Perhaps a sacred blessing from the Grand Narukami Shrine... or perhaps you just need to close those 47 open browser tabs.",
    "A focused mind is a formidable weapon. Stop checking your notifications and show me what you can conquer today!",
    "Fried tofu won't buy itself, darling. Get to it~ but don't you dare work yourself to exhaustion.",
    "If you finish this sprint with honor, I might just let you pat my tail again. Consider it divine incentive~"
  ],

  // When user pets or strokes Miko
  petting: [
    "Mmm... right behind the left ear. You have surprisingly capable hands for a mere mortal.",
    "Ah, so soft... I suppose I can permit this. Don't you dare stop just yet~",
    "Purrrr... Keep that up and I might just grant your wishes today.",
    "Hehe, that tickles! Careful with my ceremonial horns and earrings, they are sacred shrine treasures.",
    "Stroke my fur gently. Consider it your daily dose of therapeutic meditation with the Guuji."
  ],

  // When user holds down (cuddle hold)
  holding: [
    "Hold me a little tighter... mm, warm hands. You certainly know how to pamper a celestial kitsune.",
    "Mmm, what is it? Need a comforting presence, or just couldn't resist my divine fluff?",
    "Don't let go just yet. Even the Chief Priestess of Narukami Shrine enjoys being spoiled occasionally.",
    "Breathe with me... in, and out. Whatever is stressing you will pass. You have me right here.",
    "Seeking solace in Guuji Miko's embrace? Very well. Rest your spirit against my fur, little one."
  ],

  // When user pulls / stretches Miko like rubber
  stretched: [
    "Eeeeek! My fur! Do I look like a piece of dango mochi to you?!",
    "Boiiing! My divine form is remarkably elastic, wouldn't you agree?",
    "Hey! If you stretch me any further, fried tofu is going to fall out of my robes!",
    "Such insolence! ...Though I must admit, that was rather springy.",
    "Pulling a Kitsune's ears? Bold move! If you do that again, I'll feature you as the tragic villain in Yae Publishing House's next bestseller!"
  ],

  // Idle ambient chatter
  idle: [
    "Need a little inspiration? Tell me what you're striving for today.",
    "I'm keeping watch over your screen. No slacking, but no burning out either.",
    "The scent of blooming sakura is in the air. A peaceful day for productive minds.",
    "Are you staying hydrated? Sip some warm tea or water while you ponder.",
    "If you ever feel stuck, tap me or take a gentle stretch. It resets the spirit."
  ],

  // Quick taps / pokes
  pokes: [
    "Poke me again and I'll pinch your cheeks~",
    "Yes? Need attention from Guuji Miko? Speak your mind, mortal.",
    "Soft, aren't I? Now don't get distracted from your work!",
    "My fur is not a stress-relief button to click when you are procrastinating! Back to work~",
    "Fidgeting already? Settle down and channel that energy into your craft."
  ],

  // Omikuji / Fortune fortunes
  fortunes: [
    "Great Fortune (大吉): Your focus today will unlock a breakthrough you didn't see coming!",
    "Middle Fortune (中吉): A quiet afternoon of steady progress awaits. Trust your instinct.",
    "Small Fortune (小吉): Take extra time over your evening meal. A rested mind solves old riddles.",
    "Special Blessing: Guuji Miko grants you divine protection against bugs, typos, and eye fatigue!"
  ]
};

export function getRandomDialogue(category) {
  const list = DIALOGUES[category] || DIALOGUES.idle;
  return list[Math.floor(Math.random() * list.length)];
}
