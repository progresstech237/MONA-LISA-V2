const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/hotbot';

global.hotbotSessions = global.hotbotSessions || {};
global.hotbotModels = global.hotbotModels || {};

const MODELS = ['gpt-5','gpt-4o','gpt-4o-mini','claude-3.5-sonnet','claude-3-opus','gemini-2.0-flash','gemini-2.5-pro','deepseek-v3','deepseek-r1','llama-3.3-70b','qwen-2.5'];

async function callHotbot({ action='chat', message='', model='gpt-5', sessionId='' }) {
  const params = { action };
  if (action === 'chat') {
    params.prompt = message;
    params.message = message; // support both
    params.model = model;
    if (sessionId) params.sessionId = sessionId;
  }
  if (action === 'reset' && sessionId) params.sessionId = sessionId;
  const { data } = await axios.get(API, { params, timeout: 90000 });
  return data;
}

cmd({
  pattern: "hotbot",
  alias: ["hot", "gpt5", "hotai", "hb", "chatbot2"],
  react: "🔥",
  desc: "Hotbot multi-model chat gpt-5, claude, gemini, deepseek + session - /api/ai/hotbot",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    const sess = global.hotbotSessions[from] || '';
    const currentModel = global.hotbotModels[from] || 'gpt-5';

    // MENU
    if (!q) {
      return reply(
`╭─ *🔥 HOTBOT - LIVE ✅* ─
│ Model: ${currentModel}
│ Session: ${sess? sess.slice(0,20)+'...' : 'None'}
│ Supports: gpt-5, gpt-4o, claude, gemini, deepseek
│
├─ *📌 USAGE*
│.hotbot Hello how are you?
│.hotbot gpt-4o | Write a poem
│.hotbot claude-3.5-sonnet | Explain quantum
│.hotbot reset - Clear session
│.hotbot models - List models
│
├─ *🔥 MODELS*
│ gpt-5, gpt-4o, gpt-4o-mini
│ claude-3.5-sonnet, claude-3-opus
│ gemini-2.0-flash, gemini-2.5-pro
│ deepseek-v3, deepseek-r1
│ llama-3.3-70b, qwen-2.5
│
├─ *⚙️ FORMAT*
│.hotbot <model> | <message>
│.hotbot <message> (uses ${currentModel})
│
╰─ Session saves automatically`
      );
    }

    const low = q.toLowerCase().trim();

    if (low === 'reset' || low === 'clear') {
      try {
        if (sess) await callHotbot({ action: 'reset', sessionId: sess });
      } catch {}
      delete global.hotbotSessions[from];
      return reply(`✅ *Hotbot session reset*\nModel stays: ${currentModel}\nPrevious ID: ${sess || 'None'}`);
    }

    if (low === 'models' || low === 'model list') {
      const res = await callHotbot({ action: 'models' }).catch(()=>null);
      const list = res?.data?.models || res?.models || MODELS;
      return reply(`*🔥 HOTBOT MODELS*\n\n${(Array.isArray(list)?list:MODELS).map(m=>`• ${m}`).join('\n')}\n\nUse:.hotbot gpt-4o | your question\nCurrent: ${currentModel}`);
    }

    await conn.sendMessage(from, { react: { text: "🔥", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    // Parse model | message
    let model = currentModel;
    let message = q;

    if (q.includes('|')) {
      const parts = q.split('|').map(s=>s.trim());
      const maybeModel = parts[0].toLowerCase();
      if (MODELS.some(m=>maybeModel.includes(m.split('-')[0])) || MODELS.includes(maybeModel) || maybeModel.startsWith('gpt') || maybeModel.startsWith('claude') || maybeModel.startsWith('gemini') || maybeModel.startsWith('deepseek') || maybeModel.startsWith('llama') || maybeModel.startsWith('qwen')) {
        model = parts[0].toLowerCase();
        message = parts[1];
        global.hotbotModels[from] = model;
      }
    }

    if (!message) return reply('❌ Message needed. Ex:.hotbot Hello');

    const data = await callHotbot({ action: 'chat', message, model, sessionId: sess });
    const replyText = data?.data?.reply || data?.reply || data?.data?.result || JSON.stringify(data).slice(0,1000);
    const newSid = data?.data?.sessionId || data?.sessionId || sess;
    const usedModel = data?.data?.model || data?.model || model;

    if (newSid) global.hotbotSessions[from] = newSid;

    await conn.sendMessage(from, {
      text: `*🔥 HOTBOT • ${usedModel.toUpperCase()}*\n\n${replyText}\n\n> Session: ${newSid?.slice(0,22)}... • ${data?.timestamp? new Date(data.timestamp).toLocaleTimeString() : ''}`
    }, { quoted: mek });

  } catch (e) {
    console.error('Hotbot error', e.response?.data || e.message);
    reply(`❌ *Hotbot Failed*\n${e.response?.data?.message || e.response?.data?.error || e.message}\n\nTry:.hotbot Hi can you see\nOr:.hotbot reset`);
  }
});
