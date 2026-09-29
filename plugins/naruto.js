const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/Maker/naruto';

cmd({
  pattern: "naruto",
  alias: ["narutologo", "narutotext", "konohalogo"],
  react: "🍥",
  desc: "Generate Naruto-style logo - TextPro - /api/Maker/naruto",
  category: "maker",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *🍥 NARUTO LOGO - LIVE ✅* ─
│ TextPro - Raw PNG - Konoha bg
│
├─ *📌 USAGE*
│.naruto PROGRESS TECH
│.naruto Dixon Omega
│.naruto Your Name
│.naruto RedX Bot
│
├─ *🔥 YOUR SCREENSHOT*
│.naruto PROGRESS TECH → orange Naruto font
│ over Hokage mountain + sky
│
╰─ Endpoint: /api/Maker/naruto?text=`
      );
    }

    await conn.sendMessage(from, { react: { text: "🍥", key: mek.key } });
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
      caption: `*🍥 NARUTO LOGO DONE ✅*\n*Text:* ${text}\n\n> @PROGRESS TECH• TextPro`
    }, { quoted: mek });

  } catch (e) {
    console.error('Naruto error', e.message);
    reply(`❌ Failed: ${e.message}\n\nTry:.naruto PROGRESS TECH`);
  }
});
