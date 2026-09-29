const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://eliteprotech-apis.zone.id/ai/asyntai';
const sessions = new Map(); // user -> session_id

cmd({
  pattern: "asyntai",
  alias: ["ai","asyn","askai"],
  react: "🤖",
  desc: "Chat with Asyntai AI",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sender }) => {
  if(!q) return reply('Use: .asyntai Hi how are you?');

  try{
    const prevSession = sessions.get(sender) || '';
    const url = `${API}?prompt=${encodeURIComponent(q)}${prevSession ? `&session_id=${prevSession}` : ''}`;
    
    const { data } = await axios.get(url, { timeout: 20000 });
    
    if(!data?.success) return reply(`❌ AI failed: ${JSON.stringify(data).slice(0,500)}`);
    
    // save session for next message
    if(data.session_id) sessions.set(sender, data.session_id);

    const answer = data.response || data.result || 'No response';
    await reply(`*🤖 Asyntai:*\n\n${answer}`);
  }catch(e){
    reply(`❌ Error: ${e.response ? JSON.stringify(e.response.data).slice(0,600) : e.message}`);
  }
});

cmd({
  pattern: "clearai",
  react: "🗑️",
  desc: "Clear Asyntai session",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { sender, reply }) => {
  sessions.delete(sender);
  reply('✅ Session cleared');
});