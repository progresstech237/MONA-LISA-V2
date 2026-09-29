// ═══════════════════════════════════════════════════════════════════════════
//   🎮 GAME ARCADE — MONA LISA V2
//   Powered by Progress Tech
//
//   Original, fully text-based games — pure local logic, nothing to break,
//   no external API dependency. Built on the exact same pattern already
//   proven in fun-extra.js's mathgame: a Map<chatId, sessionState> plus a
//   companion `on: "body"` listener command that reads free-text replies.
//
//   Note on naming: these are original games in familiar genres (runner,
//   quiz, word game, 1v1 battle) rather than games branded with real
//   franchise names/characters — that keeps this safe to ship without any
//   trademark/IP concerns.
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const { pick, success, error, footer } = require('../lib/responses');
const config = require('../config');

function box(title, body) {
    return `╭─ ${title} ─╮\n${body}${footer(config)}`;
}

// Shared cleanup: every session map below stores { ...state, expiresAt }.
// A single sweep interval evicts anything stale so a session can never
// leak forever if someone abandons a game mid-round.
const ALL_SESSION_MAPS = [];
function trackedMap() {
    const m = new Map();
    ALL_SESSION_MAPS.push(m);
    return m;
}
setInterval(() => {
    const now = Date.now();
    for (const map of ALL_SESSION_MAPS) {
        for (const [key, val] of map) {
            if (val && val.expiresAt && now > val.expiresAt) map.delete(key);
        }
    }
}, 30000).unref();

// ═══════════════════════════════════════════════════════════════════════════
//   1) GUESS THE NUMBER
// ═══════════════════════════════════════════════════════════════════════════
const guessSessions = trackedMap();

cmd({ pattern: "guessnumber", alias: ["gtn"], desc: "Guess the secret number (1-100)", category: "games", react: "🔢", filename: __filename },
    async (conn, mek, m, { reply, from }) => {
        guessSessions.set(from, { target: 1 + Math.floor(Math.random() * 100), tries: 0, maxTries: 7, expiresAt: Date.now() + 120000 });
        reply(box("🔢 GUESS THE NUMBER", `I'm thinking of a number between *1 and 100*.\nYou have *7* tries. Just reply with a number!`));
    });

cmd({ pattern: "guessnumber-listener", on: "body", dontAddCommandList: true, filename: __filename },
    async (conn, mek, m, { from, body, reply }) => {
        const s = guessSessions.get(from);
        if (!s) return;
        const guess = parseInt((body || '').trim(), 10);
        if (isNaN(guess)) return;
        s.tries++;
        if (guess === s.target) {
            guessSessions.delete(from);
            return reply(success(`🎉 *${guess}* is correct! You got it in ${s.tries} tries.`));
        }
        if (s.tries >= s.maxTries) {
            guessSessions.delete(from);
            return reply(error(`Out of tries! The number was *${s.target}*.`));
        }
        reply(`${guess < s.target ? '📈 Higher!' : '📉 Lower!'} (${s.maxTries - s.tries} tries left)`);
    });

// ═══════════════════════════════════════════════════════════════════════════
//   2) HANGMAN
// ═══════════════════════════════════════════════════════════════════════════
const HANGMAN_WORDS = ["javascript", "elephant", "mountain", "keyboard", "sunshine", "umbrella", "chocolate", "dinosaur", "birthday", "adventure", "telephone", "butterfly", "waterfall", "backpack", "notebook"];
const HANGMAN_STAGES = [
    "😀", "🙂", "😐", "😟", "😨", "😰", "💀"
];
const hangmanSessions = trackedMap();

function renderHangman(s) {
    const display = s.word.split('').map(ch => s.guessed.includes(ch) ? ch : '_').join(' ');
    const wrong = s.wrongLetters.length ? s.wrongLetters.join(', ') : '—';
    return `${HANGMAN_STAGES[s.wrongCount]}  Lives left: ${6 - s.wrongCount}\n\n*${display}*\n\n❌ Wrong: ${wrong}\n\n_Reply with a single letter._`;
}

cmd({ pattern: "hangman", desc: "Play a game of Hangman", category: "games", react: "🪢", filename: __filename },
    async (conn, mek, m, { reply, from }) => {
        const word = pick(HANGMAN_WORDS);
        const s = { word, guessed: [], wrongLetters: [], wrongCount: 0, expiresAt: Date.now() + 180000 };
        hangmanSessions.set(from, s);
        reply(box("🪢 HANGMAN", renderHangman(s)));
    });

cmd({ pattern: "hangman-listener", on: "body", dontAddCommandList: true, filename: __filename },
    async (conn, mek, m, { from, body, reply }) => {
        const s = hangmanSessions.get(from);
        if (!s) return;
        const letter = (body || '').trim().toLowerCase();
        if (!/^[a-z]$/.test(letter)) return;
        if (s.guessed.includes(letter) || s.wrongLetters.includes(letter)) return reply("You already tried that letter.");

        if (s.word.includes(letter)) {
            s.guessed.push(letter);
            if (s.word.split('').every(ch => s.guessed.includes(ch))) {
                hangmanSessions.delete(from);
                return reply(success(`🎉 You saved yourself! The word was *${s.word}*.`));
            }
            reply(box("🪢 HANGMAN", renderHangman(s)));
        } else {
            s.wrongLetters.push(letter);
            s.wrongCount++;
            if (s.wrongCount >= 6) {
                hangmanSessions.delete(from);
                return reply(error(`💀 Game over! The word was *${s.word}*.`));
            }
            reply(box("🪢 HANGMAN", renderHangman(s)));
        }
    });

// ═══════════════════════════════════════════════════════════════════════════
//   3) ROCK PAPER SCISSORS (single-shot, no listener needed)
// ═══════════════════════════════════════════════════════════════════════════
const RPS_BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const RPS_EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };

cmd({ pattern: "rps", alias: ["rockpaperscissors"], desc: "Play Rock Paper Scissors vs the bot", category: "games", react: "✂️", use: ".rps rock|paper|scissors", filename: __filename },
    async (conn, mek, m, { reply, args }) => {
        const choice = (args[0] || '').toLowerCase();
        if (!RPS_BEATS[choice]) return reply(box("✂️ ROCK PAPER SCISSORS", "Usage: *.rps rock* | *.rps paper* | *.rps scissors*"));
        const botChoice = pick(Object.keys(RPS_BEATS));
        let outcome;
        if (choice === botChoice) outcome = "🤝 It's a tie!";
        else if (RPS_BEATS[choice] === botChoice) outcome = "🎉 You win!";
        else outcome = "🤖 I win!";
        reply(box("✂️ ROCK PAPER SCISSORS", `You: ${RPS_EMOJI[choice]} ${choice}\nMe: ${RPS_EMOJI[botChoice]} ${botChoice}\n\n${outcome}`));
    });

// ═══════════════════════════════════════════════════════════════════════════
//   4) QUIZ — interactive multiple-choice trivia with answer checking
//      (fun-studio.js already has a simpler question-only .trivia command;
//      this is the interactive A/B/C/D version, kept as a separate command)
// ═══════════════════════════════════════════════════════════════════════════
const QUIZ_BANK = [
    { q: "What is the capital of Japan?", options: ["Seoul", "Tokyo", "Beijing", "Bangkok"], correct: 1 },
    { q: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], correct: 2 },
    { q: "What is the largest planet in our solar system?", options: ["Earth", "Saturn", "Jupiter", "Mars"], correct: 2 },
    { q: "Which language runs natively in a web browser?", options: ["Python", "JavaScript", "C++", "Java"], correct: 1 },
    { q: "What gas do plants absorb from the air?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2 },
    { q: "How many players are on a standard football (soccer) team on the pitch?", options: ["9", "10", "11", "12"], correct: 2 },
    { q: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
    { q: "Which ocean is the largest?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
];
const quizSessions = trackedMap();

cmd({ pattern: "quiz", alias: ["quiztime"], desc: "Answer a random multiple-choice quiz question", category: "games", react: "🧠", filename: __filename },
    async (conn, mek, m, { reply, from }) => {
        const q = pick(QUIZ_BANK);
        quizSessions.set(from, { correct: q.correct, expiresAt: Date.now() + 60000 });
        const letters = ['A', 'B', 'C', 'D'];
        const lines = q.options.map((opt, i) => `${letters[i]}) ${opt}`).join('\n');
        reply(box("🧠 QUIZ TIME", `${q.q}\n\n${lines}\n\n_Reply with A, B, C or D — 60 seconds!_`));
    });

cmd({ pattern: "quiz-listener", on: "body", dontAddCommandList: true, filename: __filename },
    async (conn, mek, m, { from, body, reply }) => {
        const s = quizSessions.get(from);
        if (!s) return;
        const letter = (body || '').trim().toUpperCase();
        const idx = ['A', 'B', 'C', 'D'].indexOf(letter);
        if (idx === -1) return;
        quizSessions.delete(from);
        if (idx === s.correct) reply(success("🎉 Correct!"));
        else reply(error(`Not quite — the correct answer was *${['A', 'B', 'C', 'D'][s.correct]}*.`));
    });

// ═══════════════════════════════════════════════════════════════════════════
//   5) WORD SCRAMBLE
// ═══════════════════════════════════════════════════════════════════════════
const SCRAMBLE_WORDS = ["pyramid", "guitar", "volcano", "diamond", "festival", "library", "octopus", "rainbow", "treasure", "whisper", "compass", "lantern"];
const scrambleSessions = trackedMap();

function shuffleWord(word) {
    let letters = word.split('');
    let shuffled;
    do {
        shuffled = [...letters].sort(() => Math.random() - 0.5).join('');
    } while (shuffled === word);
    return shuffled;
}

cmd({ pattern: "scramble", desc: "Unscramble the word", category: "games", react: "🔤", filename: __filename },
    async (conn, mek, m, { reply, from }) => {
        const word = pick(SCRAMBLE_WORDS);
        scrambleSessions.set(from, { word, expiresAt: Date.now() + 90000 });
        reply(box("🔤 WORD SCRAMBLE", `Unscramble this word:\n\n*${shuffleWord(word).toUpperCase()}*\n\n_Reply with your answer — 90 seconds!_`));
    });

cmd({ pattern: "scramble-listener", on: "body", dontAddCommandList: true, filename: __filename },
    async (conn, mek, m, { from, body, reply }) => {
        const s = scrambleSessions.get(from);
        if (!s) return;
        const guess = (body || '').trim().toLowerCase();
        if (!guess) return;
        if (guess === s.word) {
            scrambleSessions.delete(from);
            return reply(success(`🎉 Correct! The word was *${s.word}*.`));
        }
        // Only treat it as a wrong (final) guess if it's roughly word-length —
        // otherwise ordinary chat in the same conversation would keep failing it.
        if (Math.abs(guess.length - s.word.length) <= 2) {
            reply("❌ Not quite, try again!");
        }
    });

// ═══════════════════════════════════════════════════════════════════════════
//   6) ARENA DUEL — original 1v1 turn-based battle (vs bot, or vs a mentioned
//      player in a group). Not modeled after any specific franchise.
// ═══════════════════════════════════════════════════════════════════════════
const duelSessions = trackedMap();

function hpBar(hp) {
    const filled = Math.max(0, Math.round(hp / 10));
    return '🟩'.repeat(filled) + '⬛'.repeat(10 - filled) + ` ${Math.max(0, hp)}/100`;
}

cmd({ pattern: "duel", alias: ["arena"], desc: "Start a turn-based duel vs the bot, or vs @mention in a group", category: "games", react: "⚔️", use: ".duel or .duel @friend", filename: __filename },
    async (conn, mek, m, { reply, from, sender, isGroup, mentionedJid }) => {
        if (duelSessions.has(from)) return reply("⚔️ A duel is already in progress in this chat. Reply *attack*, *defend*, or *heal*.");

        const opponentJid = isGroup && mentionedJid && mentionedJid[0] ? mentionedJid[0] : null;
        const s = {
            mode: opponentJid ? 'pvp' : 'pve',
            p1: sender, p1hp: 100, p1shield: false,
            p2: opponentJid || 'bot', p2hp: 100, p2shield: false,
            turn: sender,
            expiresAt: Date.now() + 240000,
        };
        duelSessions.set(from, s);
        reply(box("⚔️ ARENA DUEL", `${s.mode === 'pvp' ? `@${s.p1.split('@')[0]} vs @${s.p2.split('@')[0]}` : `@${s.p1.split('@')[0]} vs 🤖 the Bot`}\n\n${hpBar(100)}\n${hpBar(100)}\n\nReply *attack*, *defend*, or *heal*. It's ${s.mode === 'pvp' ? "the challenger's" : 'your'} turn!`));
    });

function duelMove(move, attackerHp, defenderHp, defenderShield) {
    if (move === 'attack') {
        let dmg = 10 + Math.floor(Math.random() * 16); // 10-25
        if (defenderShield) dmg = Math.floor(dmg / 2);
        return { defenderHp: Math.max(0, defenderHp - dmg), text: `hits for *${dmg}* damage${defenderShield ? ' (blocked!)' : ''}`, shieldUsed: true };
    }
    if (move === 'defend') {
        return { defenderHp, text: `braces to block the next hit`, selfShield: true };
    }
    if (move === 'heal') {
        const heal = 8 + Math.floor(Math.random() * 8); // 8-15
        return { attackerHp: Math.min(100, attackerHp + heal), text: `heals for *${heal}* HP` };
    }
    return null;
}

cmd({ pattern: "duel-listener", on: "body", dontAddCommandList: true, filename: __filename },
    async (conn, mek, m, { from, body, sender, reply }) => {
        const s = duelSessions.get(from);
        if (!s) return;
        const move = (body || '').trim().toLowerCase();
        if (!['attack', 'defend', 'heal'].includes(move)) return;

        const isP1 = sender === s.p1;
        const isP2 = sender === s.p2;
        if (s.mode === 'pvp' && !isP1 && !isP2) return; // not a participant
        if (s.mode === 'pvp' && sender !== s.turn) return reply("⏳ Wait for your turn!");
        if (s.mode === 'pve' && !isP1) return;

        const actorIsP1 = s.mode === 'pve' ? true : isP1;
        let attackerHpKey = actorIsP1 ? 'p1hp' : 'p2hp';
        let defenderHpKey = actorIsP1 ? 'p2hp' : 'p1hp';
        let defenderShieldKey = actorIsP1 ? 'p2shield' : 'p1shield';
        let attackerShieldKey = actorIsP1 ? 'p1shield' : 'p2shield';

        const result = duelMove(move, s[attackerHpKey], s[defenderHpKey], s[defenderShieldKey]);
        s[attackerShieldKey] = false; // shield only protects one incoming hit
        if (result.attackerHp !== undefined) s[attackerHpKey] = result.attackerHp;
        if (result.defenderHp !== undefined) s[defenderHpKey] = result.defenderHp;
        if (result.selfShield) s[attackerShieldKey] = true;

        let log = `@${sender.split('@')[0]} ${result.text}!\n\n${hpBar(s.p1hp)}\n${hpBar(s.p2hp)}`;

        if (s.p1hp <= 0 || s.p2hp <= 0) {
            duelSessions.delete(from);
            const winner = s.p1hp <= 0 ? s.p2 : s.p1;
            return reply(success(`${log}\n\n🏆 @${winner.split('@')[0]} wins the duel!`));
        }

        if (s.mode === 'pve') {
            // Simple bot opponent auto-move
            const botMove = pick(['attack', 'attack', 'defend', 'heal']);
            const botResult = duelMove(botMove, s.p2hp, s.p1hp, s.p1shield);
            s.p2shield = false;
            if (botResult.attackerHp !== undefined) s.p2hp = botResult.attackerHp;
            if (botResult.defenderHp !== undefined) s.p1hp = botResult.defenderHp;
            if (botResult.selfShield) s.p2shield = true;
            log += `\n🤖 Bot ${botResult.text}!\n\n${hpBar(s.p1hp)}\n${hpBar(s.p2hp)}`;
            if (s.p1hp <= 0 || s.p2hp <= 0) {
                duelSessions.delete(from);
                const winner = s.p1hp <= 0 ? 'the Bot 🤖' : `@${s.p1.split('@')[0]}`;
                return reply(success(`${log}\n\n🏆 ${winner} wins the duel!`));
            }
        } else {
            s.turn = isP1 ? s.p2 : s.p1;
            log += `\n\n⏳ It's @${s.turn.split('@')[0]}'s turn.`;
        }

        reply(box("⚔️ ARENA DUEL", log));
    });

// ═══════════════════════════════════════════════════════════════════════════
//   7) REACTION RACE — reflex/speed game (original take on the racing genre)
// ═══════════════════════════════════════════════════════════════════════════
const raceSessions = trackedMap();
const RACE_RANKS = [
    { max: 250, label: "⚡ LIGHTNING FAST!" },
    { max: 400, label: "🔥 Excellent reflexes!" },
    { max: 600, label: "👍 Pretty solid." },
    { max: 900, label: "🐢 A bit slow..." },
    { max: Infinity, label: "😴 Were you asleep?" },
];

cmd({ pattern: "race", alias: ["reactiontest"], desc: "Test your reflexes — wait for GO! then type STOP", category: "games", react: "🏁", filename: __filename },
    async (conn, mek, m, { reply, from, conn: _conn }) => {
        if (raceSessions.has(from)) return reply("🏁 A race is already starting in this chat — wait for it!");
        raceSessions.set(from, { started: false, goAt: null, expiresAt: Date.now() + 20000 });
        await reply(box("🏁 REACTION RACE", "Get ready... wait for it..."));
        const delay = 2000 + Math.floor(Math.random() * 4000); // 2-6s
        setTimeout(async () => {
            const s = raceSessions.get(from);
            if (!s) return; // cancelled/expired
            s.started = true;
            s.goAt = Date.now();
            try { await conn.sendMessage(from, { text: "🏁 *GO!!* Type STOP now!" }); } catch (_) {}
        }, delay);
    });

cmd({ pattern: "race-listener", on: "body", dontAddCommandList: true, filename: __filename },
    async (conn, mek, m, { from, body, reply }) => {
        const s = raceSessions.get(from);
        if (!s) return;
        if (!/^stop$/i.test((body || '').trim())) return;
        if (!s.started) {
            raceSessions.delete(from);
            return reply(error("🚫 False start! You typed STOP before GO. Try again with .race"));
        }
        const elapsed = Date.now() - s.goAt;
        raceSessions.delete(from);
        const rank = RACE_RANKS.find(r => elapsed <= r.max);
        reply(box("🏁 REACTION RACE", `Your reaction time: *${elapsed}ms*\n\n${rank.label}`));
    });

// (Slot machine already exists as a wallet-based game in economy.js — not duplicating it here.)
