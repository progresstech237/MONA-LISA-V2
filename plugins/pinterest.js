const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://eliteprotech-apis.zone.id/image/image';

function getThumb() {
  try {
    for (const p of ['./media/menu1.png','./media/menu2.png','./media/menu3.png','./media/menu4.png'])
      if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {}
  return null;
}

cmd({
  pattern: "pinterest",
  alias: ["image","images","img","pin"],
  react: "🖼️",
  desc: "Image Search - Direct Image",
  category: "search",
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
      const menu = `┏━━〔 🖼️ Images 〕━━┓
┃ Search HD images
┃ Provider: eliteprotech-apis.zone.id
┃
┃ *Use:*
┃ ${prefix}pinterest Omah lay
┃ ${prefix}image Ronaldo
┃ ${prefix}img Cat wallpaper
┗━━━━━━━━━━━━━━┛`;
      return await conn.sendMessage(from, { text: menu, contextInfo: ctx }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
    const { data } = await axios.get(`${API}?q=${encodeURIComponent(rawQ)}`, { timeout: 40000 });

    if(!data.success ||!data.result?.length) return reply(`❌ No images found for: ${rawQ}`);

    // Send only direct images - top 5
    for(let i = 0; i < Math.min(5, data.result.length); i++){
      const item = data.result[i];
      try{
        await conn.sendMessage(from, {
          image: { url: item.thumbnail },
          caption: `*🖼️ ${rawQ} [${i+1}/${Math.min(5, data.result.length)}]*\n\n_${BRAND}_`,
          contextInfo: ctx
        }, { quoted: mek });
      }catch{}
    }

  } catch (e) {
    reply(`❌ Error: ${e.message}`);
  }
});