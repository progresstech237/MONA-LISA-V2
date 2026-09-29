const { cmd } = require('../redx');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/remaker';
const CATBOX = 'https://catbox.moe/user/api.php';

global.remakerStore = global.remakerStore || {};

async function uploadCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileToUpload');
  form.append('fileToUpload', buffer, { filename: `face_${Date.now()}.jpg` });
  const { data } = await axios.post(CATBOX, form, { headers: form.getHeaders(), timeout: 30000 });
  if (typeof data === 'string' && data.trim().startsWith('http')) return data.trim();
  throw new Error('Catbox fail: ' + data);
}

async function downloadQuoted(conn, mek) {
  try {
    const ctx = mek.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.quotedMessage) return null;
    const qMsg = ctx.quotedMessage;
    if (!qMsg.imageMessage &&!qMsg.documentMessage) return null;
    // Download quoted
    const buffer = await conn.downloadMediaMessage({ message: qMsg });
    return buffer? Buffer.from(buffer) : null;
  } catch (e) {
    console.log('quoted dl fail', e.message);
    return null;
  }
}

async function downloadCurrent(conn, mek) {
  try {
    if (!mek.message?.imageMessage &&!mek.message?.documentMessage) return null;
    const buffer = await conn.downloadMediaMessage(mek);
    return buffer? Buffer.from(buffer) : null;
  } catch (e) {
    console.log('current dl fail', e.message);
    return null;
  }
}

cmd({
  pattern: "remaker",
  alias: ["faceswap", "swap", "fswap"],
  react: "🔄",
  desc: "FaceSwap reply-to-image working - target + swap",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    const low = (q || '').toLowerCase().trim();
    const hasQuoted =!!mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    const hasCurrent =!!mek.message?.imageMessage;

    if (!q &&!hasQuoted &&!hasCurrent) {
      return reply(
`╭─ *🔄 REMAKER - REPLY WORKING ✅* ─
│
├─ *STEP 1 - TARGET (body)*
│ Reply to BODY photo with:
│.remaker target
│
├─ *STEP 2 - SWAP (face)*
│ Reply to FACE photo with:
│.remaker swap
│ → Returns normal image
│
├─ *FAST 1-STEP*
│ Reply to BODY photo, attach FACE photo
│ with caption:.remaker
│
├─ *DIRECT URL*
│.remaker https://...target.png | https://...face.png
│
╰─ Your example working`
      );
    }

    // DIRECT URL MODE
    if (q && q.includes('http')) {
      const urls = q.match(/https?:\/\/\S+/g);
      if (urls && urls.length >= 2) {
        const targetUrl = urls[0];
        const swapUrl = urls[1];
        await conn.sendMessage(from, { react: { text: "🔄", key: mek.key } });
        const { data } = await axios.get(API, { params: { action: 'swap', target: targetUrl, swap: swapUrl }, timeout: 120000 });
        const resultUrl = data?.data?.resultUrl || data?.resultUrl;
        const buf = await axios.get(resultUrl, { responseType: 'arraybuffer' }).then(r => Buffer.from(r.data));
        return await conn.sendMessage(from, { image: buf, caption: `*🔄 Face Swap Done ✅*\nTarget: Body\nSwap: Face` }, { quoted: mek });
      }
    }

    // STEP 1: SET TARGET - reply to image with "target"
    if (low.includes('target')) {
      let buf = await downloadQuoted(conn, mek) || await downloadCurrent(conn, mek);
      if (!buf) return reply('❌ Reply to an IMAGE with.remaker target\n\nYou must REPLY to the body image.');

      await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      const url = await uploadCatbox(buf);
      global.remakerStore[from] = { targetUrl: url, time: Date.now() };
      return reply(`✅ *TARGET SAVED*\n${url}\n\nNow reply to FACE image with:\n.remaker swap`);
    }

    // STEP 2: SWAP - reply to image with "swap" or just.remaker
    if (low.includes('swap') || (hasQuoted || hasCurrent)) {
      const stored = global.remakerStore[from];

      // Case: both images in one message (reply to body + attach face with.remaker)
      let currentBuf = await downloadCurrent(conn, mek);
      let quotedBuf = await downloadQuoted(conn, mek);

      let targetUrl = '';
      let swapUrl = '';

      if (currentBuf && quotedBuf) {
        // 1-step: quoted = target, current = swap
        await conn.sendMessage(from, { text: `⏳ Uploading both images...` }, { quoted: mek });
        targetUrl = await uploadCatbox(quotedBuf);
        swapUrl = await uploadCatbox(currentBuf);
      }
      else if (stored?.targetUrl) {
        // 2-step: we have target, now need swap
        let swapBuf = quotedBuf || currentBuf;
        if (!swapBuf) return reply('❌ Reply to FACE image with.remaker swap\n\nYou already have target saved, now reply to face photo.');
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        swapUrl = await uploadCatbox(swapBuf);
        targetUrl = stored.targetUrl;
        delete global.remakerStore[from];
      }
      else {
        return reply('❌ No TARGET found.\n\n*Do this:*\n1. Reply to BODY image:\n.remaker target\n\n2. Then reply to FACE image:\n.remaker swap');
      }

      // CALL API
      await conn.sendPresenceUpdate('composing', from);
      const { data } = await axios.get(API, {
        params: { action: 'swap', target: targetUrl, swap: swapUrl },
        timeout: 120000
      });

      const result = data?.data || data;
      const resultUrl = result?.resultUrl;
      if (!resultUrl) throw new Error('No resultUrl: ' + JSON.stringify(data).slice(0,400));

      const imgBuf = await axios.get(resultUrl, { responseType: 'arraybuffer', timeout: 60000 }).then(r => Buffer.from(r.data));

      // RETURN AS NORMAL IMAGE - NOT FILE
      await conn.sendMessage(from, {
        image: imgBuf,
        caption: `*🔄 Face Swap Done ✅*`
      }, { quoted: mek });

      return await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    }

  } catch (e) {
    console.error('Remaker reply error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.error || e.message}\n\nDo:\n1..remaker target (reply body)\n2..remaker swap (reply face)`);
  }
});
