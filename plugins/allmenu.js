// ═══════════════════════════════════════════════════════════════════════════
//   👑 MONA LISA MENU — the legendary command list
//   Powered by Progress Tech
// ═══════════════════════════════════════════════════════════════════════════

const { cmd, commands } = require("../redx");
const moment = require("moment-timezone");
const config = require("../config");
const { fakevCard } = require('../lib/fakevCard');
const { pick } = require('../lib/responses');

const bootTime = Date.now();

// Maps the raw `category` string every plugin registers with to a
// beautiful display section. Anything unmatched falls into "Bot Tools".
const SECTIONS = [
    { key: 'ai', title: '🧠 AI & INTELLIGENCE', match: ['ai'] },
    { key: 'progresstech ai', title: '💎 PROGRESS TECH AI', match: ['progresstech-ai'] },
    { key: 'progresstech tools', title: '🔮 PROGRESS TECH TOOLS', match: ['progresstech tools'] },
    { key: 'image', title: '🎨 IMAGE STUDIO', match: ['sticker', 'image'] },
    { key: 'video', title: '🎬 VIDEO STUDIO', match: ['video'] },
    { key: 'music', title: '🎵 MUSIC STUDIO', match: ['music', 'song'] },
    { key: 'download', title: '📥 DOWNLOAD TOOLS', match: ['download', 'downloader'] },
    { key: 'search', title: '🌐 SEARCH & INFO', match: ['search'] },
    { key: 'fun', title: '😄 FUN & GAMES', match: ['fun', 'games'] },
    { key: 'group', title: '👥 GROUP MANAGER', match: ['group', 'admin'] },
    { key: 'tools', title: '🛠️ UTILITIES', match: ['tools', 'settings', 'general'] },
    { key: 'system', title: '🤖 BOT TOOLS', match: ['system', 'main'] },
    { key: 'owner', title: '🔐 OWNER ONLY', match: ['owner'] },
];

const TAGLINES = [
    '"Behind every smile, a command waiting to be painted."',
    '"Elegance is the only beauty that never fades."',
    '"A masterpiece never explains itself — it performs."',
    '"Mystery is my favorite command prefix."',
    '"Painted once. Remembered forever."',
];

function sectionFor(category) {
    const c = String(category || '').toLowerCase();
    return SECTIONS.find(s => s.match.includes(c)) || SECTIONS.find(s => s.key === 'system');
}

function uptime() {
    const sec = Math.floor((Date.now() - bootTime) / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

function frame(title, lines) {
    const left = `═❰ ${title} ❱`;
    const contentWidth = Math.max(...lines.map(l => l.length + 2), left.length + 1, 22);
    const dashCount = Math.max(contentWidth - left.length, 1);
    const top = `╔${left}${'═'.repeat(dashCount)}╗`;
    const body = lines.map(l => `║ ${l}`).join('\n');
    const bottom = `╚${'═'.repeat(left.length + dashCount)}╝`;
    return `${top}\n${body}\n${bottom}`;
}

function buildMenu(pushName) {
    const grouped = {};
    let total = 0;

    for (const c of commands) {
        if (!c.pattern || !c.category || c.dontAddCommandList) continue;
        total++;
        const section = sectionFor(c.category);
        if (!grouped[section.title]) grouped[section.title] = [];
        if (!grouped[section.title].includes(c.pattern)) grouped[section.title].push(c.pattern);
    }

    const time = moment().tz("Africa/Lagos").format("HH:mm:ss");
    const date = moment().tz("Africa/Lagos").format("dddd, Do MMMM YYYY");

    const statusBox = frame('⚜️ STATUS', [
        `👤 User     : ${pushName}`,
        `👑 Owner    : ${config.OWNER_NAME}`,
        `⚡ Prefix   : ${config.PREFIX}`,
        `📜 Commands : ${total}`,
        `⏱️ Uptime   : ${uptime()}`,
        `🕰️ Time     : ${time}`,
        `📅 Date     : ${date}`,
    ]);

    const sectionBoxes = SECTIONS
        .filter(s => grouped[s.title]?.length)
        .map(s => frame(s.title, grouped[s.title].map(p => `𓊈✦𓊉 ${config.PREFIX}${p}`)))
        .join('\n\n');

    const channelBox = frame('📡 STAY CONNECTED', [
        `Join the official channel:`,
        `${config.CHANNEL_LINK}`,
    ]);

    return `
_👑 ✦ 𝐌𝐎𝐍𝐀 𝐋𝐈𝐒𝐀 V2🤭 ✦ 👑_
   ᴍɪɴɪ ʙᴏᴛ • ʟᴇɢᴇɴᴅᴀʀʏ ᴇᴅɪᴛɪᴏɴ
${'  '}${pick(TAGLINES)}

${statusBox}

${sectionBoxes}

${channelBox}

┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
🥰 *𝐌𝐎𝐍𝐀 𝐋𝐈𝐒𝐀 V2*_* 🤭 · Powered by ${config.OWNER_NAME}
`.trim();
}

// Menu images, shown in rotation each time a chat runs .menu (1st call ->
// image 1, 2nd call -> image 2, ... 5th call -> image 1 again, and so on).
// The one-time image on first connect is untouched — this only affects
// the .menu command itself.
const MENU_IMAGES = [
    'https://files.catbox.moe/w4ttld.jpg',
    'https://files.catbox.moe/96vvsr.jpg',
    'https://files.catbox.moe/1dp0f5.jpg',
    'https://files.catbox.moe/jdnmqf.jpg',
];
const menuViewCount = new Map(); // per-chat counter (in-memory; resets on restart)

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "Display the full MONA LISA command menu",
    category: "system",
    filename: __filename,
}, async (conn, mek, m, { reply }) => {
    try {
        const caption = buildMenu(m.pushName || "Guest");

        const chatKey = m.chat;
        const viewIndex = menuViewCount.get(chatKey) || 0;
        const imageUrl = MENU_IMAGES[viewIndex % MENU_IMAGES.length];
        menuViewCount.set(chatKey, viewIndex + 1);

        await conn.sendMessage(m.chat, {
            image: { url: imageUrl },
            caption,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                mentionedJid: [m.sender],
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.CHANNEL_JID,
                    newsletterName: "🥰 MONA LISA V2 🤭",
                    serverMessageId: 2,
                },
            },
        }, { quoted: fakevCard });

    } catch (err) {
        console.error("Menu error:", err);
        reply("😌 Mona Lisa noticed something went wrong building the menu... let's fix it.\n\n" + err.message);
    }
});