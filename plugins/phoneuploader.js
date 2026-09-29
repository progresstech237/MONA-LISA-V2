const { cmd } = require('../redx');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/tools/Pone-uploader';

cmd({
  pattern: "pone",
  alias: ["poneupload", "poneuploader", "pupload", "ptouri"],
  react: "📤",
  desc: "Upload files to Pone Host - /api/tools/Pone-uploader",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasQuotedMedia = quoted && (quoted.imageMessage || quoted.videoMessage || quoted.documentMessage || quoted.audioMessage || quoted.stickerMessage);
    const hasDirectMedia = mek.message?.imageMessage || mek.message?.videoMessage || mek.message?.documentMessage;

    if (!hasQuotedMedia && !hasDirectMedia) {
      return reply(
`╭─ *📤 PONE UPLOADER - LIVE ✅* ─
│ Max ~100MB per file - Direct links
│
├─ *📌 USAGE*
│ Reply to image/video/file with:
│.pone
│.pone 7 (if expiry supported)
│
├─ *⚙️ PARAMS*
│ POST?action=upload
│ file=multipart/form-data
│
├─ *🔥 RETURNS*
│ direct URL + bucket URL + expiry
│
╰─ Endpoint: /api/tools/Pone-uploader`
      );
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    let buffer;
    let fileName = 'file.jpg';
    let mimeType = 'image/jpeg';

    try {
      const target = hasQuotedMedia? { message: quoted } : mek;
      buffer = await conn.downloadMediaMessage(target);
      buffer = Buffer.from(buffer);

      const msg = hasQuotedMedia? quoted : mek.message;
      if (msg.imageMessage) { fileName = 'image.jpg'; mimeType = 'image/jpeg'; }
      else if (msg.videoMessage) { fileName = 'video.mp4'; mimeType = 'video/mp4'; }
      else if (msg.documentMessage) { fileName = msg.documentMessage.fileName || 'document'; mimeType = msg.documentMessage.mimetype || 'application/octet-stream'; }
      else if (msg.audioMessage) { fileName = 'audio.mp3'; mimeType = 'audio/mpeg'; }
      else if (msg.stickerMessage) { fileName = 'sticker.webp'; mimeType = 'image/webp'; }
    } catch (e) {
      return reply(`❌ Download failed: ${e.message}`);
    }

    const form = new FormData();
    form.append('file', buffer, { filename: fileName, contentType: mimeType });

    // Try both POST param styles
    const { data } = await axios.post(API, form, {
      headers: form.getHeaders(),
      params: { action: 'upload' },
      timeout: 120000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const result = data?.data || data;
    const url = result?.url || result?.direct || result?.link || data?.url;

    if (!url && !result?.files) {
      return reply(`❌ Upload fail raw: ${JSON.stringify(data).slice(0,1200)}`);
    }

    let msg = `*📤 PONE UPLOADED ✅*\n\n`;
    if (result.slug) msg += `*Slug:* \`${result.slug}\`\n`;
    if (result.url) msg += `*URL:* ${result.url}\n`;
    if (result.expires) msg += `*Expires:* ${result.expires}\n\n`;

    if (result.files) {
      result.files.forEach((f,i)=>{
        msg+=`*File ${i+1}:* ${f.name||fileName}\nDirect: ${f.direct||f.url}\nDL: ${f.download||f.direct}\n\n`;
      });
    } else {
      msg+=`*Direct:* ${result.direct||result.url||url}\n`;
      if (result.download) msg+=`*Download:* ${result.download}\n`;
    }

    msg += `\n> @Omegatech-01 • Pone Host`;

    await conn.sendMessage(from, { text: msg }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Pone error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.message || e.message}`);
  }
});
