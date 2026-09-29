const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://eliteprotech-apis.zone.id/ai/zonerai';

function getThumb() { 
  try { 
    for (const p of ['./media/menu1.png','./media/menu2.png','./media/menu3.png','./media/menu4.png']) 
      if (fs.existsSync(p)) return fs.readFileSync(p); 
  } catch {} 
  return null; 
}

cmd({
  pattern: "zonerai",
  alias: ["zoneai","imagine","zimage","genimg"],
  react: "🎨",
  desc: "ElitePro ZonerAI Image Generator (replaces imagine)",
  category: "progresstech ai",
  use: ".zonerai a dog with sunglasses and dress written progresstech",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let rawQ = (q || "").trim();
    const inter = mek.message?.interactiveResponseMessage;
    if (inter?.nativeFlowResponseMessage?.paramsJson) {
      try { const p = JSON.parse(inter.nativeFlowResponseMessage.paramsJson); if (p.id) rawQ = p.id.replace(prefix,"").trim(); } catch {}
    }
    if (mek.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
      rawQ = mek.message.listResponseMessage.singleSelectReply.selectedRowId.replace(prefix,"").trim();
    }

    const ctx = { forwardingScore: 999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: NEWSLETTER_JID, serverMessageId: 142, newsletterName: '🥷TECH TOY🧑‍💻™ ✓' } };

    if (!rawQ) {
        let thumb = null; 
        try { 
          const { prepareWAMessageMedia } = require('@whiskeysockets/baileys'); 
          const tb = getThumb(); 
          if (tb) { 
            const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer }); 
            thumb = media.imageMessage; 
          } 
        } catch {}

        const menu = `┏━━〔 🧠 ZonerAI Elite 〕━━┓
┃ AI Image Generator
┃ via eliteprotech-apis.zone.id
┃
┃ *How to use:*
┃ ${prefix}zonerai <prompt>
┃
┃ *Example:*
┃ ${prefix}zonerai Hi how are you doing can you teach me hacking
┃ ${prefix}zonerai a cyberpunk girl with 6 monitors
┃ ${prefix}zonerai a dog putting on sun glasses
┗━━━━━━━━━━━━━━┛
`;
        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎨 Try Hacking Prompt", id: `${prefix}zonerai Hi how are you doing can you teach me hacking` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🐶 Dog Example", id: `${prefix}zonerai a dog putting on sun glasses and a dress written progresstech` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 Channel", url: CHANNEL_LINK }) }
        ];
        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "🧠 ZonerAI • PROGRESS TECH", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
                body: { text: menu }, footer: { text: BRAND }, nativeFlowMessage: { buttons }
            }, contextInfo: ctx
        }, {});
    }

    await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });

    // ElitePro ZonerAI - returns image binary directly
    const url = `${API}?prompt=${encodeURIComponent(rawQ)}`;
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000 });

    await conn.sendMessage(from, { 
      image: Buffer.from(response.data),
      caption: `*🧠 ZonerAI Result*\n*Prompt:* ${rawQ}\n\n_${BRAND}_\n${CHANNEL_LINK}`,
      contextInfo: ctx
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('ZonerAI Error:', e.message);
    reply(`*❌ ZonerAI Failed*\n${e.message}\n\nTry: .zonerai a futuristic city`);
  }
});