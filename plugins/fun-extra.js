// ═══════════════════════════════════════════════════════════════════════════
//   😄 FUN EXTRA — MONA LISA
//   Powered by Progress Tech
//   Pure local logic — no external dependency, nothing to break.
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const { pick, success, error, footer } = require('../lib/responses');
const config = require('../config');

function box(title, body) {
    return `╭─ ${title} ─╮\n${body}${footer(config)}`;
}

// ── Truth or Dare ──
const DARES = [
    "Send a voice note singing the chorus of your favorite song.",
    "Text the last person you called and tell them a random fun fact.",
    "Reply to this using only emojis for the next 3 messages.",
    "Post your current battery percentage and last app you used.",
    "Send the 5th photo in your gallery (SFW only!).",
    "Type your next message with your eyes closed.",
    "Compliment the group in the most dramatic way possible.",
];
const TRUTHS = [
    "What's the most embarrassing thing on your phone right now?",
    "What's a lie you told that somehow worked out fine?",
    "What's the weirdest thing you've Googled this month?",
    "Who in this chat would you trust with a secret, and why?",
    "What's a habit you have that you'd never admit out loud?",
    "What's the last thing you cried (or almost cried) about?",
];

cmd({ pattern: "dare", desc: "Get a fun dare", category: "fun", react: "😈", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("😈 DARE", pick(DARES))));

cmd({ pattern: "truth", desc: "Get a truth question", category: "fun", react: "🤔", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("🤔 TRUTH", pick(TRUTHS))));

// ── Playful insult / roast (exaggerated, silly — not real hate speech) ──
const INSULTS = [
    "You have the energy of a phone at 1% brightness in direct sunlight.",
    "You're like a software update — nobody asked, and it's slowing everything down.",
    "If overthinking burned calories, you'd be an athlete.",
    "You bring the same energy as a 'reply-all' email nobody wanted.",
    "You're proof that even autocorrect gives up sometimes.",
];
const ROASTS = [
    "Your WiFi has better commitment to you than your last relationship.",
    "You're the reason the instructions say 'do not attempt without supervision.'",
    "Even your shadow considers taking a day off from following you.",
    "Your search history probably has more red flags than a marathon.",
    "You have main character energy in a background character's life.",
];

cmd({ pattern: "insult", desc: "Get a playful (not mean) insult", category: "fun", react: "😏", filename: __filename },
    async (conn, mek, m, { reply, mentionedJid }) => {
        const target = mentionedJid?.[0] || m.quoted?.sender;
        const prefix = target ? `@${target.split('@')[0]}, ` : '';
        reply(box("😏 INSULT (all in fun)", `${prefix}${pick(INSULTS)}`));
    });

cmd({ pattern: "roast", alias: ["burn"], desc: "Generate a savage (but playful) roast", category: "fun", react: "🔥", filename: __filename },
    async (conn, mek, m, { reply, mentionedJid }) => {
        const target = mentionedJid?.[0] || m.quoted?.sender;
        const prefix = target ? `@${target.split('@')[0]}, ` : '';
        reply(box("🔥 ROAST (all in fun)", `${prefix}${pick(ROASTS)}`));
    });

// ── Dev jokes ──
const DEV_JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "There are 10 types of people: those who understand binary and those who don't.",
    "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
    "It's not a bug, it's an undocumented feature.",
    "Why do Java developers wear glasses? Because they don't C#.",
    "I told my code a joke about UDP. Not sure if it got it.",
    "99 little bugs in the code, 99 little bugs. Take one down, patch it around, 127 little bugs in the code.",
];
cmd({ pattern: "devjoke", alias: ["codejoke"], desc: "Get a random programming joke", category: "fun", react: "💻", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("💻 DEV JOKE", pick(DEV_JOKES))));

// ── Ship (playful compatibility %, deterministic from the two names) ──
function hashPercent(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % 101;
}
cmd({ pattern: "ship", desc: "Ship yourself (or two mentioned people) for a fun compatibility %", category: "fun", react: "💘", filename: __filename },
    async (conn, mek, m, { reply, mentionedJid, pushname }) => {
        const names = mentionedJid?.length >= 2
            ? mentionedJid.slice(0, 2).map(j => j.split('@')[0])
            : mentionedJid?.length === 1
                ? [pushname || 'You', mentionedJid[0].split('@')[0]]
                : null;
        if (!names) return reply("💘 *Usage:* mention 1–2 people, e.g. .ship @friend or .ship @friend1 @friend2");
        const pct = hashPercent(names.join('+'));
        const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
        reply(box("💘 SHIP RESULT", `${names[0]} 💞 ${names[1]}\n\n[${bar}] ${pct}%`));
    });

// ── Fake tweet formatter (your OWN text, styled as a tweet — not attributing quotes to anyone else) ──
cmd({ pattern: "tweet", alias: ["post"], desc: "Format your own text as a tweet-style image caption", category: "fun", react: "🐦", filename: __filename },
    async (conn, mek, m, { reply, q, pushname }) => {
        if (!q) return reply("🐦 *Usage:* .tweet <your text>\n\n_Formats your own words in a tweet-style layout — not for putting words in someone else's mouth._");
        const handle = (pushname || 'user').toLowerCase().replace(/\s+/g, '');
        reply(
            `╭─────────────────────╮\n` +
            `│ 🐦 *${pushname || 'You'}* @${handle}\n` +
            `│\n` +
            `│ ${q}\n` +
            `│\n` +
            `│ 💬 0   🔁 0   ❤️ 0\n` +
            `╰─────────────────────╯`
        );
    });

// ── Math game (single round, checked via a body listener) ──
const pendingMath = new Map(); // chatId -> { answer, expiresAt }

cmd({ pattern: "mathgame", desc: "Start a quick math challenge", category: "fun", react: "🧮", filename: __filename },
    async (conn, mek, m, { reply, from }) => {
        const a = 1 + Math.floor(Math.random() * 50);
        const b = 1 + Math.floor(Math.random() * 50);
        const ops = ['+', '-', '×'];
        const op = pick(ops);
        const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
        pendingMath.set(from, { answer, expiresAt: Date.now() + 30000 });
        reply(box("🧮 MATH CHALLENGE", `${a} ${op} ${b} = ?\n\n_Reply with just the number — you have 30 seconds!_`));
    });

cmd({
    pattern: 'mathgame-listener',
    on: 'body',
    dontAddCommandList: true,
    filename: __filename,
}, async (conn, mek, m, { from, body, reply }) => {
    const pending = pendingMath.get(from);
    if (!pending) return;
    if (Date.now() > pending.expiresAt) { pendingMath.delete(from); return; }
    const guess = parseInt((body || '').trim(), 10);
    if (isNaN(guess)) return;
    pendingMath.delete(from);
    if (guess === pending.answer) reply(success(`🎉 Correct! The answer was ${pending.answer}.`));
    else reply(error(`Not quite — the answer was *${pending.answer}*.`));
});
