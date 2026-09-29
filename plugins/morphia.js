const { cmd } = require('../redx');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/Morphai';
const CATBOX = 'https://catbox.moe/user/api.php';

// ── Upload to Catbox ──
async function uploadToCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileToUpload');
  form.append('fileToUpload', buffer, { filename: `morph_${Date.now()}.jpg` });
  const { data } = await axios.post(CATBOX, form, { headers: form.getHeaders(), timeout: 30000 });
  if (typeof data === 'string' && data.startsWith('http')) return data.trim();
  throw new Error('Catbox upload failed: ' + data);
}

// ── Get quoted image buffer 100% ──
async function getQuotedImageBuffer(conn, mek, m) {
  try {
    // Try m.quoted first (redx)
    if (m.quoted) {
      const buf = await conn.downloadMediaMessage({ message: { imageMessage: m.quoted.imageMessage || m.quoted } });
      if (buf) return buf;
    }
    // Try contextInfo
    const ctx = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage 
              || mek.message?.imageMessage 
              || m.quoted;
    if (!ctx) return null;
    
    // Find image key
    const q = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage || ctx;
    const type = Object.keys(q)[0];
    if (!type) return null;
    const media = await conn.downloadMediaMessage({ message: { [type]: q[type] } });
    return media;
  } catch (e) {
    console.log('getQuoted error', e.message);
    return null;
  }
}

async function callMorphai(params) {
  const { data } = await axios.get(API, { params, timeout: 120000 });
  // expected: { data: { imageUrl: "..."} } or { data: { styles: [...] } }
  return data;
}

// ── MAIN COMMAND ──
cmd({
  pattern: "morphai",
  alias: ["morph", "remix", "img2img", "retake", "enhanceimg"],
  react: "✨",
  desc: "MorphAI - Reply to image to apply style, retake, edit, enhance",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    // MENU
    if (!q && !m.quoted) {
      // Fetch styles for preview
      let preview = '';
      try {
        const r = await callMorphai({ action: 'styles' });
        const cats = r?.data?.styles || r?.styles || [];
        preview = cats.slice(0, 3).map(c => `• ${c.category}: ${(c.styles||[]).slice(0,3).map(s=>s.name).join(', ')}`).join('\n');
      } catch {}
      
      return reply(
`╭─ *✨ MORPHAI - REPLY TO IMAGE 100%* ─
│ Endpoint: /api/ai/Morphai
│ Must reply to image/photo
│
├─ *📌 HOW TO USE*
│ Reply to image + type:
│.morphai Doll Life Ⅰ - Doll style
│.morphai retake Calm - Expression
│.morphai edit make background beach
│.morphai enhance - HD upscale
│.morphai styles - List all styles
│
├─ *🎭 RETAKE EXPRESSIONS*
│ Funny, Calm, Smile, Surprise, Sad
│
├─ *🎨 STYLES PREVIEW*
│${preview || '• Doll: Doll Life Ⅰ, Ⅱ, Ⅲ, Ⅳ\n• Figure Studio: 13 styles\n• Use.morphai styles for full list'}
│
├─ *EXAMPLES*
│ (reply to photo)
│.morphai Doll Life Ⅰ
│.morphai retake Smile
│.morphai edit add sunglasses
│.morphai enhance
│
╰─ Returns IMAGE, not URL ✅`
      );
    }

    // LIST STYLES
    if ((q||'').toLowerCase().startsWith('styles') || q.toLowerCase() === 'style' || q.toLowerCase() === 'list') {
      await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      const r = await callMorphai({ action: 'styles' });
      const cats = r?.data?.styles || r?.styles || r?.data || [];
      let txt = `*🎨 MORPHAI STYLES (${cats.length} categories)*\n\n`;
      for (const c of cats) {
        if (!c.category) continue;
        txt += `*${c.category}:*\n${(c.styles||[]).map(s=>`• ${s.name||s.id}`).join('\n')}\n\n`;
      }
      return reply(txt.slice(0, 4000) + `\nUse: reply image +.morphai <StyleName>`);
    }

    // NEED IMAGE REPLY
    const imgBuf = await getQuotedImageBuffer(conn, mek, m);
    if (!imgBuf) {
      return reply(`❌ *Reply to an image!*\n\nCorrect:\n1. Reply to photo\n2. Type.morphai Doll Life Ⅰ\n\nOr.morphai enhance (reply to image)\n.morphai styles to see styles`);
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    // Upload to Catbox
    const catboxUrl = await uploadToCatbox(imgBuf);

    // Parse action
    let action = 'img2img';
    let style = q.trim();
    let prompt = '';

    const low = q.toLowerCase();

    if (low.startsWith('retake')) {
      action = 'retake';
      style = q.replace(/^retake\s+/i, '').trim() || 'Smile';
    } else if (low.startsWith('edit')) {
      action = 'edit';
      prompt = q.replace(/^edit\s+/i, '').trim();
      style = '';
      if (!prompt) return reply('Give edit prompt: .morphai edit make background sunset');
    } else if (low.startsWith('enhance') || low === 'hd' || low === 'upscale') {
      action = 'enhance';
      style = '';
    } else {
      // default img2img
      action = 'img2img';
      style = q.trim();
      if (!style) style = 'Doll Life Ⅰ';
    }

    const params = { action, imageUrl: catboxUrl };
    if (action === 'img2img') params.style = style;
    if (action === 'retake') params.style = style; // Calm, Smile etc
    if (action === 'edit') params.prompt = prompt;

    const res = await callMorphai(params);
    
    // Extract result imageUrl
    const outUrl = res?.data?.imageUrl || res?.data?.url || res?.imageUrl || res?.url || res?.data?.result;
    if (!outUrl) throw new Error('No image returned: ' + JSON.stringify(res).slice(0, 500));

    // DOWNLOAD AND RETURN AS IMAGE (not URL)
    const imgResp = await axios.get(outUrl, { responseType: 'arraybuffer', timeout: 60000 });
    const outBuf = Buffer.from(imgResp.data);

    await conn.sendMessage(from, {
      image: outBuf,
      caption: `*✨ MORPHAI ${action.toUpperCase()}*\n*Style:* ${style || prompt || 'HD'}\n*Original:* ${catboxUrl}\n\n> @Omegatech-01 • Returns image ✅`
    }, { quoted: mek });

  } catch (e) {
    console.error('MorphAI error', e.response?.data || e.message);
    reply(`❌ *MorphAI Failed*\n${e.response?.data?.message || e.response?.data?.error || e.message}\n\nMake sure you REPLIED to image.\nTry:.morphai styles`);
  }
});
