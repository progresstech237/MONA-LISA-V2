const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/tools/Sitekey';

cmd({
  pattern: "sitekey",
  alias: ["turnstile", "cfkey", "extractkey", "getsitekey"],
  react: "🔑",
  desc: "Extract Cloudflare Turnstile sitekeys from URL - /api/tools/Sitekey",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *🔑 SITEKEY EXTRACTOR - LIVE ✅* ─
│ Extract CF Turnstile keys from URL
│ Scans HTML + external JS
│
├─ *📌 USAGE*
│.sitekey https://example.com
│.sitekey https://files.catbox.moe/qm6qeb.png
│.sitekey https://site-with-turnstile.com/login
│
├─ *⚙️ HOW IT WORKS*
│ action=extract
│ url=target URL
│ → returns all found sitekeys
│
├─ *🔥 YOUR SCREENSHOT*
│.sitekey https://files.catbox.moe/qm6qeb.png
│ → Status 200 + keys
│
╰─ Endpoint: /api/tools/Sitekey`
      );
    }

    const url = q.trim().split(/\s+/)[0];
    if (!url.startsWith('http')) {
      return reply('❌ Need valid URL starting with http:// or https://\nEx:.sitekey https://example.com');
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    const { data } = await axios.get(API, {
      params: { action: 'extract', url },
      timeout: 30000
    });

    const info = data?.data || data;
    const method = info?.method || 'Unknown';
    const keys = info?.sitekeys || info?.keys || info?.sitekey || [];
    const count = Array.isArray(keys)? keys.length : (keys?1:0);

    let msg = `*🔑 SITEKEY EXTRACTOR DONE ✅*\n\n`;
    msg += `*URL:* ${url}\n`;
    msg += `*Method:* ${method}\n`;
    msg += `*Found:* ${count} key(s)\n\n`;

    if (Array.isArray(keys) && keys.length > 0) {
      keys.forEach((k,i)=>{
        const key = typeof k === 'string'? k : (k.key || k.sitekey || JSON.stringify(k));
        msg += `${i+1}. \`${key}\`\n`;
      });
    } else if (typeof keys === 'string') {
      msg += `*Key:* \`${keys}\`\n`;
    } else {
      msg += `*Raw:* \n\`\`\`${JSON.stringify(info, null, 2).slice(0,1000)}\`\`\`\n`;
      if (count===0) msg += `\n⚠️ No Turnstile found on this URL`;
    }

    msg += `\n> @Progresstech  • CF Turnstile Scanner`;

    await conn.sendMessage(from, { text: msg }, { quoted: mek });

  } catch (e) {
    console.error('Sitekey error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.message || e.message}\n\nTry:.sitekey https://example.com`);
  }
});
