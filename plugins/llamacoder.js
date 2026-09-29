const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/llamacoder';

global.llamaSessions = global.llamaSessions || {};

async function callLlama({ action='create', prompt='', sessionId='', quality='low' }) {
  const params = { action, quality };
  if (prompt) params.prompt = prompt;
  if (sessionId) params.sessionId = sessionId;
  const { data } = await axios.get(API, { params, timeout: 120000 });
  return data;
}

cmd({
  pattern: "llama",
  alias: ["llamacoder", "lcoder", "lc", "buildapp", "appgen"],
  react: "🦙",
  desc: "LlamaCoder - Build full React apps - create/followup - /api/ai/llamacoder",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    const currentSid = global.llamaSessions[from] || '';

    if (!q) {
      return reply(
`╭─ *🦙 LLAMACODER - LIVE ✅* ─
│ Builds full React / TSX apps
│ Session: ${currentSid? currentSid.slice(0,20)+'...' : 'None'}
│
├─ *📌 USAGE*
│.llama Build a Whatsapp Bot
│.llama Build todo app with dark mode
│.llama followup Add dark mode | ${currentSid? 'uses last session' : ''}
│.llama quality high | Build CRM dashboard
│.llama list - List sessions
│.llama reset - Delete session
│
├─ *⚙️ QUALITY*
│ low = Fast (your screenshot)
│ high = Better code, slower
│ Use:.llama quality high | Build...
│
├─ *🔥 FEATURES*
│ Returns src/App.tsx + all files
│ Session memory - iterate with followup
│ Sends as FILE not URL
│
╰─ Endpoint: /api/ai/llamacoder`
      );
    }

    const low = q.toLowerCase().trim();
    if (low === 'reset' || low === 'clear' || low.startsWith('delete')) {
      try { if (currentSid) await callLlama({ action: 'delete_session', sessionId: currentSid }); } catch {}
      delete global.llamaSessions[from];
      return reply('✅ LlamaCoder session deleted.');
    }

    if (low === 'list' || low === 'list_sessions') {
      const data = await callLlama({ action: 'list_sessions' });
      const sessions = data?.sessions || data?.data?.sessions || [];
      if (!sessions.length) return reply('No sessions found or list not supported.');
      return reply(`*🦙 SESSIONS*\n\n${sessions.map(s=>`• ${s.sessionId || s.id} - ${s.prompt || ''}`).join('\n').slice(0,1500)}`);
    }

    await conn.sendMessage(from, { react: { text: "🦙", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    // Parse quality + followup
    let action = 'create';
    let prompt = q;
    let quality = 'low';
    let sessionId = currentSid;

    if (q.toLowerCase().startsWith('quality')) {
      const parts = q.split('|');
      const qPart = parts[0].toLowerCase();
      if (qPart.includes('high')) quality = 'high';
      if (qPart.includes('low')) quality = 'low';
      prompt = parts[1]?.trim() || parts.slice(1).join('|').trim() || 'Build a website';
    }

    if (q.toLowerCase().startsWith('followup')) {
      action = 'followup';
      prompt = q.replace(/followup/i,'').replace('|','').trim();
      if (!sessionId) return reply('❌ No session for followup. First build:.llama Build a Whatsapp Bot');
    }

    // If user provides sessionId|prompt
    if (q.includes('|') &&!q.toLowerCase().startsWith('quality')) {
      const maybeSid = q.split('|')[0].trim();
      if (maybeSid.length > 10 && maybeSid.includes('-')) {
        // looks like sessionId
        sessionId = maybeSid;
        prompt = q.split('|').slice(1).join('|').trim();
        if (low.startsWith('followup') || currentSid) action = 'followup';
      }
    }

    const res = await callLlama({ action, prompt, sessionId, quality });
    const data = res?.data || res;

    const files = data?.files || res?.files || [];
    const newSid = data?.sessionId || res?.sessionId || sessionId;
    const chatId = data?.chatId || res?.chatId;
    const promptUsed = data?.prompt || res?.prompt || prompt;

    if (!files || files.length === 0) {
      return reply(`❌ No files returned: ${JSON.stringify(res).slice(0,800)}`);
    }

    if (newSid) global.llamaSessions[from] = newSid;

    // Send info
    await conn.sendMessage(from, {
      text: `*🦙 LLAMACODER BUILT*\n*Prompt:* ${promptUsed}\n*Session:* ${newSid}\n*ChatId:* ${chatId}\n*Files:* ${files.length}\n*Quality:* ${quality}\n*Action:* ${action}\n\n_Sending ${files.length} file(s) as documents..._`
    }, { quoted: mek });

    const tempDir = path.join(__dirname, `../../temp/llama_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Write all files and send
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const filePath = f.path || `file_${i}.tsx`;
      const content = f.content || f.code || '';

      // Create subfolders
      const fullPath = path.join(tempDir, filePath);
      try { fs.mkdirSync(path.dirname(fullPath), { recursive: true }); } catch {}
      fs.writeFileSync(fullPath, content, 'utf8');

      // Send file (limit to first 5 files to avoid spam, else zip needed)
      if (i < 5) {
        await conn.sendMessage(from, {
          document: fs.readFileSync(fullPath),
          mimetype: 'text/typescript',
          fileName: path.basename(filePath),
          caption: `*${filePath}* | ${content.length} chars\nSession: ${newSid}`
        }, { quoted: mek });
      }
    }

    // If more than 5 files, zip info
    if (files.length > 5) {
      await conn.sendMessage(from, {
        text: `*📦 ${files.length} files total*\nFirst 5 sent individually.\nAll files saved in temp folder: ${tempDir}\n\n*File list:*\n${files.map(f=>`• ${f.path}`).join('\n').slice(0,1500)}`
      }, { quoted: mek });
    }

    // Preview first file
    const firstCode = files[0]?.content || '';
    if (firstCode) {
      await conn.sendMessage(from, {
        text: `*📄 PREVIEW - ${files[0].path}*\n\n\`\`\`tsx\n${firstCode.slice(0,1200)}\n\`\`\`\n\n_Type:.llama followup Add dark mode_ to iterate`
      }, { quoted: mek });
    }

  } catch (e) {
    console.error('LlamaCoder error', e.response?.data || e.message);
    reply(`❌ *LlamaCoder Failed*\n${e.response?.data?.message || e.response?.data?.error || e.message}\n\nTry:.llama Build a Whatsapp Bot\nQuality low is faster`);
  }
});
