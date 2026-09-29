const { cmd } = require('../redx');
const axios = require('axios');

const BASE = 'https://eliteprotech-apis.zone.id/ai/story';

cmd({
  pattern: "story",
  alias: ["storyai","tale"],
  react: "📖",
  desc: "Generate AI story",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  if(!q) return reply('Use: .story A girl named Mia who found treasure in the woods');

  try{
    await conn.sendMessage(m.chat, { react: { text: "✍️", key: mek.key } });
    
    const url = `${BASE}?text=${encodeURIComponent(q)}`;
    const { data } = await axios.get(url, { timeout: 30000 });

    if(!data.success) return reply(`❌ Failed: ${JSON.stringify(data).slice(0,500)}`);

    const story = data.story || data.response || data.result || '';
    if(!story) return reply('No story returned');

    // Clean \n\n
    const clean = story.replace(/\\n/g, '\n');

    await reply(`*📖 Story: ${q}*\n\n${clean}\n\n_— Powered by *PROGRESS TECH*_`);
  }catch(e){
    reply(`❌ Error: ${e.response ? JSON.stringify(e.response.data).slice(0,600) : e.message}`);
  }
});