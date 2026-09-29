const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://eliteprotech-apis.zone.id/ai/mathgpt';

function getThumb() { 
  try { 
    for (const p of ['./media/menu1.png','./media/menu2.png','./media/menu3.png','./media/menu4.png']) 
      if (fs.existsSync(p)) return fs.readFileSync(p); 
  } catch {} 
  return null; 
}

cmd({
  pattern: "mathgpt",
  alias: ["math","mgpt","mathai","solve"],
  react: "🧮",
  desc: "MathGPT Solver - EliteProTech",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let rawQ = (q || "").trim();
    const ctx = { 
      forwardingScore: 999, 
      isForwarded: true, 
      forwardedNewsletterMessageInfo: { 
        newsletterJid: NEWSLETTER_JID, 
        serverMessageId: 142, 
        newsletterName: '🥷TECH TOY🧑‍💻™ ✓' 
      } 
    };

    if (!rawQ) {
      const menu = `┏━━〔 🧮 MathGpt 〕━━┓
┃ Solves any math problem
┃ Provider: eliteprotech-apis.zone.id
┃
┃ *Use:*
┃ ${prefix}mathgpt 200×A÷5600=x²
┃ ${prefix}mathgpt solve x^2+5x+6=0
┃ ${prefix}math What is 15% of 200?
┗━━━━━━━━━━━━━━┛`;

      return await conn.sendMessage(from, { text: menu, contextInfo: ctx }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "🧮", key: mek.key } });
    
    const { data } = await axios.get(`${API}?q=${encodeURIComponent(rawQ)}`, { timeout: 40000 });
    
    if(!data.status && !data.answer) return reply(`❌ Failed: ${JSON.stringify(data).slice(0,600)}`);
    
    let answer = data.answer || 'No answer';
    answer = answer.replace(/\\n/g, '\n').replace(/\n\n+/g, '\n\n');

    await conn.sendMessage(from, { 
      text: `*🧮 MathGpt*\n\n*Q:* ${data.question || rawQ}\n\n${answer}\n\n_${BRAND}_`, 
      contextInfo: ctx 
    }, { quoted: mek });

  } catch (e) {
    reply(`❌ Error: ${e.response ? JSON.stringify(e.response.data).slice(0,400) : e.message}`);
  }
});