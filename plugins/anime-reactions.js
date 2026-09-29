// ═══════════════════════════════════════════════════════════════════════════
//   🎭 ANIME REACTIONS — MONA LISA (FIXED)
//   Powered by Progress Tech
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const axios = require('axios');

const REACTIONS = {
    hug: { desc: '🤗 Send someone a warm hug', emoji: '🤗' },
    kiss: { desc: '😘 Send someone a kiss', emoji: '😘' },
    pat: { desc: 'Give someone a pat on the head', emoji: '🥰' },
    cuddle: { desc: 'Cuddle up with someone', emoji: '🫂' },
    cry: { desc: 'Show that you\'re crying', emoji: '😢' },
    dance: { desc: 'Bust out a dance', emoji: '💃' },
    poke: { desc: 'Poke someone', emoji: '👉' },
    bonk: { desc: 'Bonk someone', emoji: '🔨' },
    bite: { desc: 'Playfully bite someone', emoji: '😼' },
    blush: { desc: 'Show that you\'re blushing', emoji: '😊' },
    smile: { desc: 'Flash a smile', emoji: '😄' },
    wave: { desc: 'Wave hello or goodbye', emoji: '👋' },
    highfive: { desc: 'Give someone a high five', emoji: '🙏' },
    handhold: { desc: 'Hold someone\'s hand', emoji: '🤝' },
    nom: { desc: 'Nom nom nom', emoji: '😋' },
    happy: { desc: 'Show that you\'re happy', emoji: '😃' },
    wink: { desc: 'Give a cheeky wink', emoji: '😉' },
    yeet: { desc: 'Yeet something', emoji: '💨' },
    kill: { desc: 'Dramatically "kill" someone (anime-style)', emoji: '💀' },
    smug: { desc: 'Show off a smug face', emoji: '😏' },
    neko: { desc: 'Get a cute neko image', emoji: '🐱' },
    waifu: { desc: 'Get a waifu image', emoji: '💖' },
    megumin: { desc: 'Get a Megumin image', emoji: '🧙‍♀️' },
    shinobu: { desc: 'Get a Shinobu image', emoji: '🦋' },
    awoo: { desc: 'Awoo!', emoji: '🐺' },
    cringe: { desc: 'Show that something is cringe', emoji: '😬' },
    bully: { desc: 'Playfully bully someone', emoji: '😈' },
    lick: { desc: 'Give a playful lick', emoji: '👅' },
    slap: { desc: 'Slap someone (anime-style)', emoji: '👋' },
    glomp: { desc: 'Glomp someone with a big tackle-hug', emoji: '🤗' },
};

for (const [name, meta] of Object.entries(REACTIONS)) {
    cmd({
        pattern: name,
        desc: `${meta.desc} (anime reaction)`,
        category: 'fun',
        react: meta.emoji || '🎭',
        filename: __filename,
    }, async (conn, mek, m, { from, reply, q }) => {
        try {
            const { data } = await axios.get(`https://api.waifu.pics/sfw/${name}`, { timeout: 15000 });
            
            if (!data?.url) throw new Error('No URL');

            let caption = `${meta.emoji} *${name.toUpperCase()}*`;
            if (q) caption += `\n${meta.desc} → ${q}`;
            else caption += `\n${meta.desc}`;

            await conn.sendMessage(from, {
                image: { url: data.url },
                caption: caption
            }, { quoted: mek });

        } catch (e) {
            console.log(`[${name}] waifu.pics error:`, e.response?.status || e.message);
            // Fallback to waifu.im or nekos.best if waifu.pics fails for this category
            try {
                const fallback = await axios.get(`https://api.waifu.im/search?included_tags=${name}`, { timeout: 10000 });
                const url = fallback.data?.images?.[0]?.url;
                if (url) {
                    return await conn.sendMessage(from, { image: { url }, caption: `${meta.emoji} *${name.toUpperCase()}*` }, { quoted: mek });
                }
            } catch {}
            reply(`*❌ Could not fetch ${name} right now.* Try again in a moment.`);
        }
    });
}