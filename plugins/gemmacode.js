const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/Gemma-code-gen';
const CATBOX = 'https://catbox.moe/user/api.php';

global.gemmaSessions = global.gemmaSessions || {};
global.gemmaLastCode = global.gemmaLastCode || {};

async function uploadToCatbox(buffer, ext='html') {
  const form = new FormData();
  form.append('reqtype', 'fileToUpload');
  form.append('fileToUpload', buffer, { filename: `gemma_${Date.now()}.${ext}` });
  const { data } = await axios.post(CATBOX, form, { headers: form.getHeaders(), timeout: 30000 });
  if (typeof data === 'string' && data.startsWith('http')) return data.trim();
  throw new Error('Catbox fail: ' + data);
}

async function callGemma(prompt, sessionId='') {
  const params = { prompt };
  if (sessionId) params.sessionId = sessionId;
  const { data } = await axios.get(API, { params, timeout: 90000 });
  return data;
}

// Try to get screenshot of HTML via free thum.io
async function getHtmlScreenshot(htmlUrl) {
  // thum.io - free screenshot API, no key needed
  const shotUrl = `https://image.thum.io/get/width/1280/crop/900/noanimate/${htmlUrl}`;
  const resp = await axios.get(shotUrl, { responseType: 'arraybuffer', timeout: 40000 });
  return Buffer.from(resp.data);
}

cmd({
  pattern: "gemma",
  alias: ["gemmacode", "codegen", "buildsite", "gcode", "gpreview"],
  react: "💻",
  desc: "Gemma Code Gen + LIVE Preview Image - /api/ai/Gemma-code-gen",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *💻 GEMMA v2 - WITH PREVIEW ✅* ─
│ Builds website + screenshot
│
├─ *📌 USAGE*
│.gemma Build me a tracking website
│.gemma Build todo app with tailwind
│.gemma preview - Screenshot last code
│.gemma reset
│
├─ *✨ NEW FEATURE*
│ After code generation, bot will:
│ 1. Send preview text
│ 2. Send.html file
│ 3. Send screenshot IMAGE of website
│
╰─ Endpoint: /api/ai/Gemma-code-gen`
      );
    }

    const low = q.toLowerCase().trim();

    if (low === 'reset' || low === 'clear') {
      delete global.gemmaSessions[from];
      delete global.gemmaLastCode[from];
      return reply('✅ Gemma session cleared.');
    }

    // PREVIEW LAST CODE
    if (low === 'preview' || low.startsWith('preview')) {
      const last = global.gemmaLastCode[from];
      if (!last) return reply('❌ No last code. First do:.gemma Build me a site');

      await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      const htmlUrl = await uploadToCatbox(Buffer.from(last.code, 'utf8'), 'html');
      const shotBuf = await getHtmlScreenshot(htmlUrl);
      return await conn.sendMessage(from, {
        image: shotBuf,
        caption: `*📸 PREVIEW - Last Build*\n*Prompt:* ${last.prompt}\n*URL:* ${htmlUrl}\n_Screenshot via thum.io_`
      }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    const sid = global.gemmaSessions[from] || '';
    const res = await callGemma(q, sid);

    const sessionId = res?.data?.sessionId || res?.sessionId;
    const code = res?.data?.code || res?.code || '';
    const promptUsed = res?.data?.prompt || q;

    if (!code || code.length < 10) return reply(`❌ No code: ${JSON.stringify(res).slice(0,500)}`);

    if (sessionId) global.gemmaSessions[from] = sessionId;
    global.gemmaLastCode[from] = { code, prompt: promptUsed, sessionId };

    // Detect type
    let ext = 'html', mime = 'text/html';
    if (code.includes('<html') || code.includes('<!DOCTYPE')) ext='html';
    else if (code.includes('import React')) ext='jsx';
    else if (code.trim().startsWith('def ') || code.includes('print(')) ext='py';

    // 1. Preview text
    const previewTxt = code.slice(0, 1200) + (code.length>1200?'...':'');
    await conn.sendMessage(from, {
      text: `*💻 GEMMA BUILT*\n*Prompt:* ${promptUsed}\n*Session:* ${sessionId?.slice(0,20)}...\n*Size:* ${code.length} chars\n\n\`\`\`${ext}\n${previewTxt.slice(0,800)}\n\`\`\`\n\n_Generating file + screenshot..._`
    }, { quoted: mek });

    // 2. Send file
    const tempDir = path.join(__dirname, '../../temp');
    try { fs.mkdirSync(tempDir, { recursive: true }); } catch {}
    const filePath = path.join(tempDir, `gemma_${Date.now()}.${ext}`);
    fs.writeFileSync(filePath, code, 'utf8');

    await conn.sendMessage(from, {
      document: fs.readFileSync(filePath),
      mimetype: mime,
      fileName: `gemma-${promptUsed.slice(0,20).replace(/[^a-z0-9]/gi,'_')}.${ext}`,
      caption: `*Gemma Code:* ${promptUsed}`
    }, { quoted: mek });

    // 3. NEW: Screenshot preview if HTML
    if (ext === 'html') {
      try {
        await conn.sendMessage(from, { text: `*📸 Rendering preview image...*\n_Uploading HTML & screenshotting..._` }, { quoted: mek });
        const htmlUrl = await uploadToCatbox(Buffer.from(code, 'utf8'), 'html');
        const shotBuf = await getHtmlScreenshot(htmlUrl);
        await conn.sendMessage(from, {
          image: shotBuf,
          caption: `*📸 LIVE PREVIEW*\n*Prompt:* ${promptUsed}\n*Link:* ${htmlUrl}\n*Session:* ${sessionId}\n\n_Type. ${promptUsed} again to improve_`
        }, { quoted: mek });
      } catch (e) {
        console.log('Screenshot fail', e.message);
        await conn.sendMessage(from, { text: `⚠️ Screenshot failed (thum.io limit), but file sent. Open HTML file to view.\nError: ${e.message}` }, { quoted: mek });
      }
    }

    try { fs.unlinkSync(filePath); } catch {}

  } catch (e) {
    console.error('Gemma v2 error', e.response?.data || e.message);
    reply(`❌ *Gemma Failed*\n${e.response?.data?.message || e.message}`);
  }
});
