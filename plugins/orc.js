const { cmd } = require('../redx');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/tools/Ocr';
const CATBOX = 'https://catbox.moe/user/api.php';

async function uploadCatbox(buffer, fileName='ocr.jpg') {
  const form = new FormData();
  form.append('reqtype', 'fileToUpload');
  form.append('fileToUpload', buffer, { filename: fileName });
  const { data } = await axios.post(CATBOX, form, { headers: form.getHeaders(), timeout: 30000 });
  if (typeof data === 'string' && data.trim().startsWith('http')) return data.trim();
  throw new Error('Catbox fail: '+data);
}

cmd({
  pattern: "ocr",
  alias: ["imagetotext", "readtext", "extracttext", "totext"],
  react: "🔍",
  desc: "Extract text from image via OCR - /api/tools/Ocr",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasQuotedMedia = quoted && (quoted.imageMessage || quoted.documentMessage);
    const hasDirectMedia = mek.message?.imageMessage || mek.message?.documentMessage;

    if (!hasQuotedMedia && !hasDirectMedia && !q?.startsWith('http')) {
      return reply(
`╭─ *🔍 OCR - LIVE ✅* ─
│ Extract text via imagetotext.my
│
├─ *📌 USAGE*
│ Reply to image with:.ocr
│.ocr https://files.catbox.moe/qm6qeb.png
│
├─ *⚙️ PARAMS*
│ action=extract (only supported)
│ imageUrl=Public Image URL
│
├─ *🔥 YOUR SCREENSHOT*
│ GET .../Ocr?action=extract&imageUrl=...
│ → Status 200 + extracted text
│
╰─ Endpoint: /api/tools/Ocr`
      );
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    let imageUrl = q?.trim() || '';

    // If reply to image, upload first
    if ((hasQuotedMedia || hasDirectMedia) && !q?.startsWith('http')) {
      let buffer;
      try {
        const target = hasQuotedMedia? { message: quoted } : mek;
        buffer = await conn.downloadMediaMessage(target);
        buffer = Buffer.from(buffer);
      } catch (e) {
        return reply(`❌ Download failed: ${e.message}`);
      }
      await reply('⏳ Uploading image to Catbox...');
      imageUrl = await uploadCatbox(buffer, `ocr_${Date.now()}.jpg`);
    }

    if (!imageUrl.startsWith('http')) {
      return reply('❌ Need valid image URL\nEx:.ocr https://files.catbox.moe/qm6qeb.png\nOr reply to image with .ocr');
    }

    const { data } = await axios.get(API, {
      params: { action: 'extract', imageUrl },
      timeout: 40000
    });

    const result = data?.data || data;
    const text = result?.text || result?.extracted || result?.result || result?.data || JSON.stringify(result).slice(0,1000);

    if (!text || text.length < 2) {
      return reply(`⚠️ No text found\nRaw: ${JSON.stringify(data).slice(0,800)}`);
    }

    let msg = `*🔍 OCR DONE ✅*\n\n`;
    msg += `*Image:* ${imageUrl}\n\n`;
    msg += `*Extracted Text:*\n\`\`\`${typeof text === 'string'? text : JSON.stringify(text)}\`\`\`\n\n`;
    msg += `> @Progress Tech • imagetotext.my`;

    await conn.sendMessage(from, { text: msg }, { quoted: mek });

  } catch (e) {
    console.error('OCR error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.message || e.message}\n\nTry reply to image with .ocr`);
  }
});
