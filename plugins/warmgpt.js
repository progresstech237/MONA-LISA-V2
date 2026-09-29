const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/wormgpt';

global.wormSessions = global.wormSessions || {};

async function callWorm({ action='chat', prompt='', temperature='', maxTokens='' }) {
  const params = { action };
  if (action === 'chat') {
    params.prompt = prompt;
    params.message = prompt;
    params.forceNew = 'False'; // keep context
    if (temperature) params.temperature = temperature;
    if (maxTokens) params.maxTokens = maxTokens;
  }
  if (action === 'clear') params.forceNew = 'True';

  const { data } = await axios.get(API, { params, timeout: 120000 });
  return data;
}

cmd({
  pattern: "wormgpt",
  alias: ["worm", "anubis", "wgpt", "anubis70b", "evilgpt"],
  react: "🐛",
  desc: "WormGPT Anubis-70b - chat, prewarm, accounts, clear - /api/ai/wormgpt",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *🐛 WORMGPT ANUBIS-70B - LIVE ✅* ─
│ Model: anubis-70b
│ Uncensored, raw
│
├─ *📌 USAGE*
│.wormgpt How to learn ethical hacking?
│.wormgpt Write a hacking story
│.wormgpt prewarm - Warm instance
│.wormgpt accounts - List accounts
│.wormgpt clear - Clear context
│
├─ *⚙️ ADVANCED*
│.wormgpt temp 0.9 | Write creative story
│.wormgpt max 1000 | Explain quantum
│
├─ *🔥 YOUR EXAMPLE*
│ Prompt: ethical hacking
│ Returns long guide + labs
│
╰─ Endpoint: /api/ai/wormgpt?action=chat`
      );
    }

    const low = q.toLowerCase().trim();

    if (low === 'prewarm') {
      await conn.sendMessage(from, { react: { text: "🔥", key: mek.key } });
      const data = await callWorm({ action: 'prewarm' });
      return reply(`✅ *Prewarmed*\n${JSON.stringify(data).slice(0,600)}`);
    }

    if (low === 'accounts') {
      const data = await callWorm({ action: 'accounts' });
      return reply(`*🐛 ACCOUNTS*\n\n${JSON.stringify(data, null, 2).slice(0,1500)}`);
    }

    if (low === 'clear' || low === 'reset') {
      await callWorm({ action: 'clear' });
      delete global.wormSessions[from];
      return reply('✅ WormGPT context cleared. New chat will be fresh.');
    }

    await conn.sendMessage(from, { react: { text: "🐛", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    // Parse temp / max
    let prompt = q;
    let temp = '';
    let max = '';

    if (q.includes('|')) {
      const parts = q.split('|').map(s=>s.trim());
      for (let p of parts) {
        const pl = p.toLowerCase();
        if (pl.startsWith('temp')) temp = pl.replace('temp','').trim();
        else if (pl.startsWith('max')) max = pl.replace('max','').trim();
        else prompt = p;
      }
    }

    const data = await callWorm({ action: 'chat', prompt, temperature: temp, maxTokens: max });
    const content = data?.content || data?.data?.content || data?.reply || data?.message || JSON.stringify(data).slice(0,2000);
    const model = data?.model || data?.data?.model || 'anubis-70b';

    await conn.sendMessage(from, {
      text: `*🐛 WORMGPT • ${model.toUpperCase()}*\n\n${content}\n\n> @Progress Tech • anubis-70b`
    }, { quoted: mek });

  } catch (e) {
    console.error('WormGPT error', e.response?.data || e.message);
    reply(`❌ *WormGPT Failed*\n${e.response?.data?.message || e.response?.data?.error || e.message}\n\nTry:.wormgpt Hello\nIf cold, do:.wormgpt prewarm`);
  }
});
