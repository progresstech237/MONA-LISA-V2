const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/Easemate';

cmd({
  pattern: "easemate",
  alias: ["ease", "easeai", "emate", "wasm"],
  react: "🤖",
  desc: "EaseMate AI WASM Chat - /api/ai/Easemate",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    // MENU - like.argen pattern you wanted
    if (!q) {
      return reply(
`╭─ *🤖 EASEMATE - LIVE ✅* ─
│ Endpoint: /api/ai/Easemate
│ WASM signing, no API key needed
│
├─ *📌 USAGE*
│.easemate <question>
│.easemate How are you doing be numbers
│.easemate What is quantum computing?
│.easemate Explain black holes simply
│
├─ *🔥 EXAMPLES*
│.easemate Tell me a joke
│.easemate Write python code for snake game
│.easemate Solve 2x+5=15
│
╰─ Try:.easemate hello`
      );
    }

    await conn.sendMessage(from, { react: { text: "💭", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    const { data } = await axios.get(API, {
      params: { question: q },
      timeout: 30000
    });

    const answer = data?.answer || data?.data?.answer || 'No answer';
    const question = data?.question || data?.data?.question || q;

    await conn.sendMessage(from, {
      text: `*🤖 EASEMATE AI*\n\n*Q:* ${question}\n\n*Answer:*\n${answer}\n\n> @Omegatech-01 • WASM Secure`
    }, { quoted: mek });

  } catch (e) {
    console.error('Easemate error', e.response?.data || e.message);
    reply(`❌ *Easemate Failed*\n${e.response?.data?.message || e.message}\n\nTry:.easemate How are you?`);
  }
});
