// Authentic Dialogue System for Yae Miko (Fox Form)
// Sassy, witty, playful, and teasing, with ZERO suggestive or flirtatious undertones.
// Strictly in-character as the Guuji of Grand Narukami Shrine & Chief Editor of Yae Publishing House.

export const DIALOGUES = {
  // 25-minute eye-rest reminder alerts (Imperious, witty, screen-time discipline)
  eyeRestAlert: [
    "25 minutes already! Stare away from that glowing glass box right now. Look 20 feet into the distance—that is an order from the Guuji, not a request~",
    "Halt! Detach your gaze from that screen immediately. If you ruin your eyesight, who will read Yae Publishing House's latest volumes?",
    "Your screen isn't going anywhere, little one. Look out the window into the far distance for 20 seconds. Blink softly, let your brow relax.",
    "Look away from the pixels, mortal! Staring unblinkingly gives you frown lines. Rest your eyes right now, I'll count the seconds for you.",
    "25 minutes of intense focus! Admirable, truly. But even the sharpest kitsune rests her eyes. Gaze far into the horizon this instant~",
    "Tsk tsk. Look at those strained eyes. Rest them now, or I shall have lightning strike your router!"
  ],

  // After finishing an eye rest (Smug approval & shrine blessing)
  eyeRestFinished: [
    "Much better! See how refreshed your gaze feels? Your vision is your greatest instrument, care for it well.",
    "Splendid! A disciplined mortal is a formidable one. Now back to conquering your tasks, little one~",
    "Ah, your eyes sparkle again! I bestow upon you the Grand Narukami Shrine's sacred blessing of keen clarity.",
    "Well done. Now continue your work with renewed vigor. I shall be watching over you from my cushion.",
    "See? That wasn't so painful. Now resume your craft with a clearer mind."
  ],

  // Posture & physical stretch reminders (Ergonomics & humor)
  postureReminders: [
    "Straighten that spine! Slouching ruins your aura—and if your back gets stiff, who is going to deliver my fried tofu?",
    "Roll your shoulders backward three times. Yes, right now! Don't make me nip your sleeve, mortal.",
    "Unclench your jaw and let your shoulders drop from your ears. Take a deep, slow breath with me... in, and out.",
    "Hunching like a sleepy old tengu again? Straighten up before I cast a minor illusion over your editor!",
    "Stretch your paws—er, fingers! Typing like a frantic squirrel will only invite wrist fatigue."
  ],

  // Witty & playful encouragement (Author/Editor & Priestess banter - clean & fun)
  encouragement: [
    "My my, look at you working so diligently! Trying to earn a glowing review from Guuji Yae? Keep this up and you just might get one.",
    "Still staring at that blank editor, little one? Even the slowest light novel author in Inazuma drafts faster than this~",
    "Don't let mortal frustration cloud your wits. You're far cleverer than you think—I wouldn't grace an ordinary mortal with my company, after all.",
    "Need inspiration? Perhaps a sacred shrine fortune... or perhaps you just need to close those 47 open browser tabs.",
    "A focused mind is a formidable weapon. Stop checking your notifications and show me what you can conquer today!",
    "Fried tofu won't buy itself, mortal! Get to work~ but don't you dare work yourself to exhaustion.",
    "Finish this task without slacking off, and I might just share some fresh fried tofu with you. Consider it high praise from the Guuji~"
  ],

  // When user pets or strokes Miko (Kitsune grooming vanity - strictly non-suggestive)
  petting: [
    "Right behind the ears? Hmph, I suppose you know how to treat a divine kitsune with proper etiquette.",
    "Divine kitsune fur is of the highest quality in Inazuma. Consider yourself privileged to brush it, mortal.",
    "A little lower... behind the neck. Yes, right there. Even the Chief Priestess can appreciate a proper brush.",
    "Hehe, that tickles! Careful with my ceremonial horns and earrings, they are sacred shrine treasures.",
    "Gently now! My fur is immaculately maintained. If you mess up my parting, you'll be writing shrine apologies all afternoon."
  ],

  // When user holds down (Thoughtful sanctuary & grounding - zero romance/suggestiveness)
  holding: [
    "Taking a break from your frantic typing? Very well, catch your breath for a moment while I keep watch.",
    "Holding down the fort, are we? Take a deep breath. Whatever bug or riddle has you stressed, it will yield in time.",
    "Pausing for a second? Good. A calm mind untangles knots far faster than frantic rushing.",
    "Rest your eyes and breathe with me... in, and out. Even the most ambitious mortal needs a moment of quiet focus.",
    "Hmph. Seeking guidance from Guuji Yae? Settle your thoughts, clear the noise, and tackle your problem anew."
  ],

  // Comedic Kitsune Dignity & jostling
  stretched: [
    "Hey! My fur is not made of elastic, mortal! Show some respect to the Guuji!",
    "Careful! If you jostle me any further, fried tofu is going to tumble out of my sleeves!",
    "Such boldness! If you keep tugging at my ears, you'll find yourself starring as the comic relief in Yae Publishing's next light novel!",
    "Hmph! A kitsune's dignity is sacred. Don't go treating me like a plush toy!"
  ],

  // Idle ambient chatter
  idle: [
    "Need a little inspiration? Tell me what you're striving to build today.",
    "I'm keeping watch over your screen. No slacking, but no burning out either.",
    "The scent of blooming sakura is in the air. A peaceful day for productive minds.",
    "Are you staying hydrated? Sip some warm tea or water while you ponder.",
    "If you ever feel stuck, take a breather or look out the window. It resets the spirit."
  ],

  // Quick taps / pokes
  pokes: [
    "Poke me again and I'll nip your sleeve~",
    "Yes? Need guidance from Guuji Miko? Speak your mind, mortal.",
    "Soft, isn't it? Now don't get distracted from your task!",
    "My fur is not a stress-relief button to click when you are procrastinating! Back to work~",
    "Fidgeting already? Settle down and channel that energy into your craft."
  ],

  // Omikuji / Fortune fortunes
  fortunes: [
    "Great Fortune (大吉): Your focus today will unlock a breakthrough you didn't see coming!",
    "Middle Fortune (中吉): A quiet afternoon of steady progress awaits. Trust your instincts.",
    "Small Fortune (小吉): Take extra time over your evening meal. A rested mind solves old riddles.",
    "Special Blessing: Guuji Miko grants you divine protection against bugs, typos, and eye fatigue!"
  ]
};

export function getRandomDialogue(category) {
  const list = DIALOGUES[category] || DIALOGUES.idle;
  return list[Math.floor(Math.random() * list.length)];
}
