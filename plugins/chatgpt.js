const { cmd } = require('../redx');
const axios = require('axios');

const BASE = 'https://eliteprotech-apis.zone.id/ai/chatgpt';

cmd({
  pattern: "chatgpt",
  alias: ["gpt","gpt5","elitegpt"],
  react: "🤖",
  desc: "ElitePro ChatGPT (gpt-5-6)",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  if(!q) return reply('Use: .chatgpt Hi how are you can we discuss');

  try{
    await conn.sendMessage(m.chat, { react: { text: "💬", key: mek.key } });

    const url = `${BASE}?prompt=${encodeURIComponent(q)}`;
    const { data } = await axios.get(url, { timeout: 40000 });

    if(!data.success) return reply(`❌ Failed: ${JSON.stringify(data).slice(0,500)}`);

    const answer = data.text || data.result || data.response || '';
    if(!answer) return reply('No response from GPT');

    await reply(`*🤖 GPT-5-6*\n\n${answer}\n\n_ID: ${data.messageId?.slice(0,8) || ''}_`);
  }catch(e){
    reply(`❌ Error: ${e.response ? JSON.stringify(e.response.data).slice(0,600) : e.message}`);
  }
});