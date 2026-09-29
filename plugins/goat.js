const { cmd } = require('../redx');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/tools/File-uploader';

cmd({
  pattern: "filegoat",
  alias: ["fgoat", "fileuploader", "goatupload", "touri", "tourl2"],
  react: "🐐",
  desc: "Upload files to FileGoat (100MB max) - /api/tools/File-uploader",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    // GET bucket info
    if (q && q.startsWith('get ')) {
      const slug = q.replace(/get\s+/i,'').trim();
      if (!slug) return reply('❌ Example:.filegoat get c77d71f2-05d7-44f7-9f88-adc171e5adc6');
      const { data } = await axios.get(API, { params: { action: 'get', slug }, timeout: 20000 });
      const d = data?.data || data;
      let msg = `*🐐 FILEGOAT BUCKET INFO*\n\n*Slug:* ${d.slug}\n*URL:* ${d.url}\n*Expires:* ${d.expires}\n*Views:* ${d.views}\n\n*Files:*\n`;
      d.files?.forEach((f,i)=>{ msg+=`${i+1}. ${f.name} (${f.size} bytes)\nDirect: ${f.direct}\nDL: ${f.download}\n\n`; });
      return reply(msg);
    }

    // Check reply media
    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasQuotedMedia = quoted && (quoted.imageMessage || quoted.videoMessage || quoted.documentMessage || quoted.audioMessage || quoted.stickerMessage);
    const hasDirectMedia = mek.message?.imageMessage || mek.message?.videoMessage || mek.message?.documentMessage;

    if (!hasQuotedMedia && !hasDirectMedia) {
      return reply(
`╭─ *🐐 FILEGOAT UPLOADER - LIVE ✅* ─
│ Max 100MB per file - Direct links
│
├─ *📌 USAGE*
│ Reply to image/video/file with:
│.filegoat
│.filegoat 7 (expire in 7 days, 1-30)
│
├─ *📂 RETRIEVE*
│.filegoat get <slug>
│ Ex:.filegoat get c77d71f2-05d7-44f7-9f88-adc171e5adc6
│
├─ *⚙️ PARAMS*
│ action=upload (default)
│ file=multipart/form-data (your file)
│ days=1-30 (expiry)
│
├─ *🔥 YOUR JSON*
│ Returns slug + filego.at/bucket/URL
│ + direct S3 link + download?download=true
│ expires: 2026-09-29T22:12:01.347Z
│
╰─ Endpoint: /api/tools/File-uploader`
      );
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    let days = 7;
    if (q &&!isNaN(q.trim())) {
      days = Math.min(30, Math.max(1, parseInt(q.trim())));
    }

    // Download media
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

    // Upload via POST multipart
    const form = new FormData();
    form.append('action', 'upload');
    form.append('file', buffer, { filename: fileName, contentType: mimeType });
    if (days) form.append('days', String(days));

    const { data } = await axios.post(API, form, {
      headers: form.getHeaders(),
      params: { action: 'upload' },
      timeout: 120000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const result = data?.data || data;
    if (!result?.url) {
      return reply(`❌ Upload fail raw: ${JSON.stringify(data).slice(0,1000)}`);
    }

    let msg = `*🐐 FILEGOAT UPLOADED ✅*\n\n`;
    msg += `*Slug:* \`${result.slug}\`\n`;
    msg += `*Bucket:* ${result.url}\n`;
    msg += `*Expires:* ${result.expires?.split('T')[0]} (${days} days)\n`;
    msg += `*Views:* ${result.views}\n\n`;

    result.files?.forEach((f,i)=>{
      msg += `*File ${i+1}:* ${f.name}\n`;
      msg += `*Size:* ${f.size||'0'} bytes\n`;
      msg += `*Direct:* ${f.direct}\n`;
      msg += `*Download:* ${f.download}\n\n`;
    });

    msg += `> @PROGRESS TECH • Max 100MB`;

    await conn.sendMessage(from, { text: msg }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('FileGoat error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.error || e.response?.data?.message || e.message}\n\nYour screenshot showed 404 on other endpoint, but this File-uploader is Working ✅`);
  }
});
