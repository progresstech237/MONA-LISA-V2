const { cmd, commands } = require("../redx");
const moment = require("moment");
const config = require("../config");
const { fakevCard } = require('../lib/fakevCard');

const botStartTime = Date.now();

function uptime() {
    const sec = Math.floor((Date.now() - botStartTime) / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
}

cmd({
    pattern: "alive",
    alias: ["status", "live"],
    desc: "Check if the bot is active and view system status",
    category: "system",
    react: "👑",
    filename: __filename,
}, async (conn, mek, m, { reply, from }) => {
    try {
        const pushname = m.pushName || "User";
        const currentTime = moment().format("HH:mm:ss");
        const currentDate = moment().format("dddd, MMMM Do YYYY");
        const totalCmds = commands.length;

        const caption = `
╭┄┄┄┄[ *🥰 MONA LISA 🤭 STATUS* ]┄┄┄┄
┊
┊  Hi 🫵🏽 ${pushname}
┊
┊ 🕒 *Time*     : ${currentTime}
┊ 📅 *Date*     : ${currentDate}
┊ ⏳ *Uptime*   : ${uptime()}
┊ ⚙️ *Mode*     : ${config.MODE || 'public'}
┊ ⚡ *Prefix*   : ${config.PREFIX || '.'}
┊ 📜 *Commands* : ${totalCmds}
┊ 👤 *Owner*    : ${config.OWNER_NAME || 'Progress Tech'}
╰───────────────

> 🤖 *🥰 MONA LISA 🤭 MINI BOT is alive and ready!*
🎉 *Enjoy the service!*
`.trim();

        await conn.sendMessage(from, {
            image: { url: config.IMAGE_PATH },
            caption,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.CHANNEL_JID,
                    newsletterName: '🥰 MONA LISA 🤭',
                    serverMessageId: 143,
                },
            },
        }, { quoted: fakevCard });

    } catch (error) {
        console.error("Error in alive command:", error);
        reply(`😌 Mona Lisa noticed something went wrong checking her status.\n\n🛠 ${error.message}`);
    }
});
