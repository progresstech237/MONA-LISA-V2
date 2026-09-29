const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/Maker/Fancy-text';

cmd({
  pattern: "fancy",
  alias: ["fancytext", "fancystyle", "stylish", "fonts"],
  react: "✨",
  desc: "Generate 60+ fancy text styles - /api/Maker/Fancy-text",
  category: "maker",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *✨ FANCY TEXT - 60+ STYLES ✅* ─
│
├─ *📌 USAGE*
│.fancy PROGRESS TECH
│.fancy Mona Lisa 
│.fancy Hello World
│.fancy Your Name
│
├─ *🔥 RETURNS 60+ STYLES*
│ 𝙿𝚁𝙾𝙶𝚁𝙴𝚂𝚂, ＰＲＯＧＲＥＳＳ, ⒫⒭⒪...
│
╰─ Endpoint: /api/Maker/Fancy-text?action=generate`
      );
    }

    await conn.sendMessage(from, { react: { text: "✨", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    const { data } = await axios.get(API, {
      params: { action: 'generate', text: q.trim() },
      timeout: 30000
    });

    const results = data?.data?.result || data?.result || data?.data || [];

    if (!Array.isArray(results) || results.length === 0) {
      return reply(`❌ No fancy result: ${JSON.stringify(data).slice(0,800)}`);
    }

    // Send in chunks - WhatsApp limit 4000 chars
    let msg = `*✨ FANCY TEXT - "${q}" - ${results.length} STYLES ✅*\n\n`;
    results.slice(0, 35).forEach((style, i) => {
      msg += `*${i+1}.* ${style}\n`;
    });

    if (results.length > 35) {
      msg += `\n... +${results.length - 35} more styles\n`;
      msg += `\n*Use copy:*\n`;
      results.slice(35, 60).forEach((style, i) => {
        msg += `${i+36}. ${style}\n`;
      });
    }

    msg += `\n> @Progress Tech • 60+ fancy fonts`;

    await conn.sendMessage(from, { text: msg }, { quoted: mek });

    // Send second message with raw list for easy copy if many
    if (results.length > 10) {
      let copyMsg = `*📋 COPY LIST:*\n\n`;
      results.forEach((s, i) => copyMsg += `${s}\n`);
      // Send as second if not too long
      if (copyMsg.length < 5000) {
        await conn.sendMessage(from, { text: copyMsg.slice(0, 4000) }, { quoted: mek });
      }
    }

  } catch (e) {
    console.error('Fancy error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.message}\n\nTry:.fancy PROGRESS TECH`);
  }
});
