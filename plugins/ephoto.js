const { cmd } = require('../redx');
const axios = require('axios');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://eliteprotech-apis.zone.id/image/ephoto';

const TYPES = ["lighteffects","effectclouds","galaxywallpaper","cartoonstyle","writetext"];

cmd({
  pattern: "ephoto",
  alias: ["ep","texteffect","lightfx"],
  react: "✨",
  desc: "Ephoto - Reply to Image Edit",
  category: "image",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    const ctx = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: NEWSLETTER_JID,
        serverMessageId: 142,
        newsletterName: '🥷TECH TOY🧑‍💻™ ✓'
      }
    };

    // Check if reply to image
    const quoted = m.quoted || mek.msg?.contextInfo?.quotedMessage;
    const isReplyImage = quoted && (quoted.imageMessage || quoted.mimetype?.includes('image'));

    if (!q &&!isReplyImage) {
      const menu = `┏━━〔 ✨ Ephoto 〕━━┓
┃ Create / Edit Images
┃ Provider: eliteprotech-apis.zone.id
┃
┃ *Types:*
┃ • lighteffects
┃ • effectclouds
┃ • galaxywallpaper
┃ • cartoonstyle
┃ • writetext
┃
┃ *Use:*
┃ ${prefix}ephoto lighteffects | A girl sleeping
┃ ${prefix}ephoto galaxywallpaper | Omah Lay
┃
┃ *Reply to Image:*
┃ Reply to image + ${prefix}ephoto cartoonstyle
┃ Reply to image + ${prefix}ephoto lighteffects | Cute girl
┗━━━━━━━━━━━━━━┛`;
      return await conn.sendMessage(from, { text: menu, contextInfo: ctx }, { quoted: mek });
    }

    // Parse type | text
    let type = "lighteffects";
    let text = q || "A girl sleeping";

    if (q) {
      if (q.includes("|")) {
        const parts = q.split("|");
        let first = parts[0].trim().toLowerCase();
        if (TYPES.includes(first)) {
          type = first;
          text = parts.slice(1).join("|").trim() || text;
        } else {
          text = q.trim();
        }
      } else {
        const firstWord = q.split(" ")[0].toLowerCase();
        if (TYPES.includes(firstWord)) {
          type = firstWord;
          text = q.slice(firstWord.length).trim() || "beautiful";
        }
      }
    } else if (isReplyImage) {
      // If only reply without text, default to cartoonstyle edit
      type = "cartoonstyle";
      text = "cartoon edit";
    }

    await conn.sendMessage(from, { react: { text: "✨", key: mek.key } });

    // If replying to image and type is cartoonstyle, we still use text API
    // but keep context of reply
    const { data } = await axios.get(`${API}?text=${encodeURIComponent(text)}&type=${encodeURIComponent(type)}`, { timeout: 60000 });

    if (!data.success ||!data.result) return reply(`❌ Failed to generate ${type}`);

    await conn.sendMessage(from, {
      image: { url: data.result },
      caption: `*✨ Ephoto: ${type}*\n*Text:* ${data.text || text}\n${isReplyImage? '*Mode:* Image Reply Edit' : ''}\n\n_${BRAND}_`,
      contextInfo: ctx
    }, { quoted: mek });

  } catch (e) {
    reply(`❌ Error: ${e.response? JSON.stringify(e.response.data).slice(0,400) : e.message}`);
  }
});