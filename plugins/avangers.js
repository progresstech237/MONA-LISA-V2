const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/Maker/avengers';

cmd({
  pattern: "avengers",
  alias: ["avlogo", "avenger", "marvelogo"],
  react: "🦸",
  desc: "Generate Avengers-style logo - TextPro - /api/Maker/avengers",
  category: "fun",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *🦸 AVENGERS LOGO - LIVE ✅* ─
│ TextPro - Raw PNG
│
├─ *📌 USAGE*
│.avengers Progress | Tech
│.avengers Omega | Tech
│.avengers Dixon | Omega
│
├─ *📝 FORMAT*
│ text1 | text2
│ text1 = small text (usually left)
│ text2 = big Avengers text
│
├─ *🔥 EXAMPLES*
│.avengers Progress | Tech → your screenshot
│.avengers King | Dixon
│.avengers RedX | Bot
│
╰─ Endpoint: /api/Maker/avengers`
      );
    }

    await conn.sendMessage(from, { react: { text: "🦸", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    let text1 = '';
    let text2 = '';

    if (q.includes('|')) {
      const parts = q.split('|').map(s=>s.trim());
      text1 = parts[0] || 'Progress';
      text2 = parts[1] || 'Tech';
    } else {
      // Split by space - first word = text1, rest = text2
      const words = q.trim().split(/\s+/);
      if (words.length === 1) {
        text1 = 'THE';
        text2 = words[0];
      } else {
        text1 = words[0];
        text2 = words.slice(1).join(' ');
      }
    }

    // Call API - returns raw PNG
    const res = await axios.get(API, {
      params: { text1, text2 },
      responseType: 'arraybuffer',
      timeout: 60000
    });

    const buf = Buffer.from(res.data);

    // Send as NORMAL IMAGE
    await conn.sendMessage(from, {
      image: buf,
      caption: `*🦸 AVENGERS LOGO DONE ✅*\n*Text1:* ${text1}\n*Text2:* ${text2}\n\n> @Omegatech-01 • TextPro`
    }, { quoted: mek });

  } catch (e) {
    console.error('Avengers error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.message}\n\nTry:.avengers Progress | Tech`);
  }
});
