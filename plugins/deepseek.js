const { cmd } = require('../redx');
const axios = require('axios');

const BASE = 'https://eliteprotech-apis.zone.id/ai/deepseekai';

cmd({
  pattern: "deepseekai",
  alias: ["deepseek","seekai","dsai"],
  react: "🧠",
  desc: "DeepSeek V4 Flash - EliteProTech",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  if(!q) return reply('Use: .deepseekai He how are you\n.deepseekai Explain hacking in simple terms');

  try{
    await conn.sendMessage(m.chat, { react: { text: "💭", key: mek.key } });

    const url = `${BASE}?prompt=${encodeURIComponent(q)}`;
    const { data } = await axios.get(url, { timeout: 40000 });

    if(!data.success) return reply(`❌ Failed: ${JSON.stringify(data).slice(0,600)}`);

    const answer = data.response || data.text || data.result || '';
    if(!answer) return reply('No response from DeepSeek');

    await reply(`*🧠 DeepSeek ${data.model}*\n\n${answer}`);

  }catch(e){
    reply(`❌ Error: ${e.response ? JSON.stringify(e.response.data).slice(0,600) : e.message}`);
  }
});