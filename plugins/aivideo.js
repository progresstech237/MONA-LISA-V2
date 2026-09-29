const { cmd } = require('../../redx');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/Ai-video';
const CATBOX = 'https://catbox.moe/user/api.php';

// Upload
async function uploadToCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileToUpload');
  form.append('fileToUpload', buffer, { filename: `aivid_${Date.now()}.jpg` });
  const { data } = await axios.post(CATBOX, form, { headers: form.getHeaders(), timeout: 30000 });
  if (typeof data === 'string' && data.startsWith('http')) return data.trim();
  throw new Error('Catbox fail: ' + data);
}

// Get quoted image
async function getQuotedBuffer(conn, mek, m) {
  try {
    const qMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!qMsg) return null;
    const type = Object.keys(qMsg)[0];
    const buf = await conn.downloadMediaMessage({ message: { [type]: qMsg[type] } });
    return buf;
  } catch { return null; }
}

cmd({
  pattern: "aivideo",
  alias: ["freevideo", "fvideo", "genvideo2", "text2video"],
  react: "🎬",
  desc: "FreeAI Video - Text2Video & Image2Video (5-10min) - /api/ai/Ai-video",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    // MENU
    if (!q && !m.quoted) {
      return reply(
`╭─ *🎬 AI-VIDEO FREE - LIVE ✅* ─
│ Model: FreeAIVideos via Omegatech
│ Time: 5-10 mins generation
│ Expiry: Download fast!
│
├─ *📌 HOW TO USE*
│.aivideo a cat walking on beach at sunset, cinematic
│ (reply to image)
│.aivideo a cat dancing -- reply to your photo
│
├─ *🖼️ MODES*
│ Text-only: Generates from scratch
│ Image+Prompt: Animates your image
│ Just reply to image + prompt
│
├─ *EXAMPLES*
│.aivideo anime girl running in rain, cinematic
│.aivideo make it walk -- (reply to image)
│.aivideo --timeout 600 a dragon flying
│
╰─ Returns VIDEO file, not link ✅`
      );
    }

    let prompt = q || 'a cat walking on the beach at sunset, cinematic';
    let timeout = 600; // default from docs

    // Parse --timeout
    const tMatch = prompt.match(/--timeout\s+(\d+)/i);
    if (tMatch) {
      timeout = parseInt(tMatch[1]);
      prompt = prompt.replace(/--timeout\s+\d+/i, '').trim();
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    
    // Check if reply to image
    let imageUrl = '';
    const buf = await getQuotedBuffer(conn, mek, m);
    if (buf) {
      await conn.sendMessage(from, { text: `*📤 Uploading image...*\n_Modes: Image+Prompt animation_` }, { quoted: mek });
      imageUrl = await uploadToCatbox(buf);
    }

    if (!prompt && !imageUrl) return reply('Give prompt: .aivideo a cat walking');

    await conn.sendMessage(from, { 
      text: `*🎬 Generating video...*\n*Prompt:* ${prompt.slice(0,100)}\n*Mode:* ${imageUrl?'Image+Prompt':'Text2Video'}\n*Timeout:* ${timeout}s\n\n⏳ *This takes 5-10 minutes — please wait, bot is working...*\n_API will hold connection until done_`
    }, { quoted: mek });

    await conn.sendPresenceUpdate('composing', from);

    // Call API - it blocks until video ready (up to timeout)
    const params = { prompt, timeout };
    if (imageUrl) params.imageUrl = imageUrl;

    const { data } = await axios.get(API, { 
      params, 
      timeout: (timeout + 30) * 1000 // axios timeout slightly more
    });

    const videoUrl = data?.videoUrl || data?.data?.videoUrl;
    const frameUrl = data?.frameUrl || data?.data?.frameUrl;
    
    if (!videoUrl) throw new Error('No videoUrl: ' + JSON.stringify(data).slice(0,500));

    await conn.sendMessage(from, { text: `*✅ Video generated! Downloading...*\n*Note:* ${data.note || 'Download before expiry'}` }, { quoted: mek });

    // DOWNLOAD VIDEO IMMEDIATELY (ngrok expires fast)
    const vidResp = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });
    const vidBuf = Buffer.from(vidResp.data);

    // Send as VIDEO file (not URL)
    await conn.sendMessage(from, {
      video: vidBuf,
      mimetype: 'video/webm',
      caption: `*🎬 AI-VIDEO*\n*Prompt:* ${prompt}\n*Mode:* ${imageUrl?'Image2Video':'Text2Video'}\n*RequestId:* ${data.requestId}\n\n> @Omegatech-01 • FreeAIVideos`
    }, { quoted: mek });

    // Also send thumbnail frame if available
    if (frameUrl) {
      try {
        await conn.sendMessage(from, { image: { url: frameUrl }, caption: `*Frame Preview*\n${prompt}` }, { quoted: mek });
      } catch {}
    }

  } catch (e) {
    console.error('Ai-video error', e.response?.data || e.message);
    const msg = e.response?.data?.message || e.message;
    if (msg.includes('timeout') || msg.includes('ECONNABORTED')) {
      return reply(`⏳ *Timeout after ${e.config?.params?.timeout||600}s*\nAPI is still generating (5-10 min). Try again with longer timeout:\n.aivideo ${q} --timeout 600\n\nOr API may be overloaded, try later.`);
    }
    reply(`❌ *Ai-video Failed*\n${msg.slice(0,400)}\n\nTry: .aivideo a cat walking on beach, cinematic`);
  }
});