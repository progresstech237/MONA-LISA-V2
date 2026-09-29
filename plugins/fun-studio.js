// ═══════════════════════════════════════════════════════════════════════════
//   😄 FUN & ENTERTAINMENT — MONA LISA
//   Powered by Progress Tech
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const { pick, footer } = require('../lib/responses');
const config = require('../config');

const JOKES = [
    "Why don't scientists trust atoms? Because they make up everything.",
    "I told my computer I needed a break, and it said no problem — it froze immediately.",
    "Why did the painter never get tired? He knew how to draw energy.",
    "Parallel lines have so much in common. Shame they'll never meet.",
    "I'm reading a book on anti-gravity. It's impossible to put down.",
    "Why don't skeletons fight each other? They don't have the guts.",
    "I used to be a banker, but I lost interest.",
    "Why did the scarecrow win an award? He was outstanding in his field.",
    "I only know 25 letters of the alphabet. I don't know y.",
    "What do you call a fish with no eyes? A fsh.",
    "Why can't your nose be 12 inches long? Because then it would be a foot.",
    "I'm on a seafood diet. I see food, and I eat it.",
];

const FACTS = [
    "Honey never spoils — archaeologists have found 3,000-year-old honey in Egyptian tombs that's still edible.",
    "Octopuses have three hearts and blue blood.",
    "A day on Venus is longer than a year on Venus.",
    "Bananas are berries, but strawberries aren't.",
    "The Eiffel Tower can grow about 15 cm taller in summer due to heat expansion.",
    "Sharks existed before trees — they're older than 400 million years.",
    "Wombat droppings are cube-shaped.",
    "There are more possible chess games than atoms in the observable universe.",
    "A group of flamingos is called a 'flamboyance'.",
    "Hot water can freeze faster than cold water under certain conditions — it's called the Mpemba effect.",
];

const QUOTES = [
    "\"Simplicity is the ultimate sophistication.\" — Leonardo da Vinci",
    "\"The mystery of life is not a problem to be solved, but a reality to be experienced.\"",
    "\"Elegance is refusal.\" — Coco Chanel",
    "\"Art is never finished, only abandoned.\" — Leonardo da Vinci",
    "\"Whoever is careless with the truth in small matters cannot be trusted with important matters.\" — Albert Einstein",
    "\"Patience is bitter, but its fruit is sweet.\"",
    "\"The smile is the shortest distance between two people.\"",
];

const TRIVIA = [
    { q: "What is the capital of Australia?", a: "Canberra" },
    { q: "Which planet is known as the Red Planet?", a: "Mars" },
    { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci" },
    { q: "What is the smallest prime number?", a: "2" },
    { q: "What ocean is the largest by surface area?", a: "The Pacific Ocean" },
    { q: "In what year did WWII end?", a: "1945" },
    { q: "What is the chemical symbol for gold?", a: "Au" },
    { q: "How many continents are there?", a: "7" },
];

const WOULD_YOU_RATHER = [
    "Would you rather have the ability to fly or be invisible?",
    "Would you rather always be 10 minutes late or 20 minutes early?",
    "Would you rather live without music or without TV/movies?",
    "Would you rather explore space or the deep ocean?",
    "Would you rather have unlimited money or unlimited time?",
    "Would you rather know when you're going to die or how you're going to die?",
];

const COMPLIMENTS = [
    "Your smile could rival a certain painting hanging in the Louvre.",
    "You bring elegance into every room you enter.",
    "Your ideas are genuinely a masterpiece in progress.",
    "You have the kind of calm that makes chaos feel manageable.",
    "Talking to you is honestly the best part of someone's day.",
    "You carry yourself with a quiet, legendary confidence.",
];

const RIDDLES = [
    { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps" },
    { q: "I speak without a mouth and hear without ears. What am I?", a: "An echo" },
    { q: "What has keys but no locks, space but no room, and you can enter but not go in?", a: "A keyboard" },
    { q: "What has to be broken before you can use it?", a: "An egg" },
    { q: "I'm tall when I'm young and short when I'm old. What am I?", a: "A candle" },
    { q: "What can travel around the world while staying in a corner?", a: "A stamp" },
];

function box(title, body) {
    return `╭─ ${title} ─╮\n${body}${footer(config)}`;
}

cmd({ pattern: "joke", alias: ["jokes"], desc: "Get a random joke", category: "fun", react: "😂", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("😂 MONA LISA JOKE", pick(JOKES))));

cmd({ pattern: "fact", alias: ["randomfact"], desc: "Get a random fun fact", category: "fun", react: "🧐", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("🧐 DID YOU KNOW?", pick(FACTS))));

cmd({ pattern: "quote", alias: ["quotes"], desc: "Get an elegant quote", category: "fun", react: "🌹", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("🌹 A WORD OF WISDOM", pick(QUOTES))));

cmd({ pattern: "trivia", alias: [], desc: "Get a random trivia question", category: "fun", react: "🧠", filename: __filename },
    async (conn, mek, m, { reply }) => {
        const t = pick(TRIVIA);
        await reply(box("🧠 TRIVIA TIME", `❓ ${t.q}\n\n_Reply with .trivia again for another — or think it through!_`));
    });

cmd({ pattern: "wyr", alias: ["wouldyourather"], desc: "Would you rather...", category: "fun", react: "🤔", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("🤔 WOULD YOU RATHER", pick(WOULD_YOU_RATHER))));

cmd({ pattern: "compliment", alias: [], desc: "Get a MONA LISA compliment", category: "fun", react: "🥰", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("🥰 FROM MONA LISA, TO YOU", pick(COMPLIMENTS))));

cmd({ pattern: "riddle", alias: [], desc: "Get a riddle to solve", category: "fun", react: "🧩", filename: __filename },
    async (conn, mek, m, { reply }) => {
        const r = pick(RIDDLES);
        await reply(box("🧩 A RIDDLE, DARLING", `${r.q}\n\n_Type .riddle again to reveal a new one, or think carefully..._`));
    });

cmd({ pattern: "coinflip", alias: ["flip"], desc: "Flip a coin", category: "fun", react: "🪙", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("🪙 COIN FLIP", pick(["Heads!", "Tails!"]))));

cmd({ pattern: "dice", alias: ["roll"], desc: "Roll a dice", category: "fun", react: "🎲", filename: __filename },
    async (conn, mek, m, { reply }) => reply(box("🎲 DICE ROLL", `You rolled a ${1 + Math.floor(Math.random() * 6)}!`)));

cmd({ pattern: "8ball", alias: ["ask8ball"], desc: "Ask the magic 8-ball a question", category: "fun", react: "🎱", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🎱 *Usage:* .8ball <your question>");
        const answers = ["Yes, definitely.", "Without a doubt.", "Ask again later.", "Signs point to yes.", "Very doubtful.", "My sources say no.", "Absolutely not.", "It is certain."];
        await reply(box("🎱 THE ANSWER APPEARS...", pick(answers)));
    });
