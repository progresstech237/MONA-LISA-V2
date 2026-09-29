const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/Maker/devil-wings';

cmd({
  pattern: "devilwings",
  alias: ["devil", "dwings", "devil-wing", "deviltext"],
  react: "😈",
  desc: "Generate Devil Wings logo - TextPro - /api/Maker/devil-wings",
  category: "fun",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *😈 DEVIL WINGS - LIVE ✅* ─
│ TextPro - Raw PNG - Red eyes + fire
│
├─ *📌 USAGE*
│.devilwings PROGRESS TECH
│.devilwings Dixon Omega
│.devilwings Your Name
│.devilwings RedX Bot
│
├─ *🔥 YOUR SCREENSHOT*
│.devilwings PROGRESS TECH → fiery devil logo
│
╰─ Endpoint: /api/Maker/devil-wings?text=`
      );
    }

    await conn.sendMessage(from, { react: { text: "😈", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    const text = q.trim();

    // Call API - raw PNG
    const res = await axios.get(API, {
      params: { text },
      responseType: 'arraybuffer',
      timeout: 60000
    });

    const buf = Buffer.from(res.data);

    // Send as NORMAL IMAGE
    await conn.sendMessage(from, {
      image: buf,
      caption: `*😈 DEVIL WINGS DONE ✅*\n*Text:* ${text}\n\n> @Omegatech-01 • TextPro`
    }, { quoted: mek });

  } catch (e) {
    console.error('DevilWings error', e.message);
    reply(`❌ Failed: ${e.message}\n\nTry:.devilwings PROGRESS TECH`);
  }
});
