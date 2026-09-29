const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/tools/web-extract';

cmd({
  pattern: "webextract",
  alias: ["wextract", "scrape", "extractweb", "webscrape", "fetchurl"],
  react: "🌐",
  desc: "Extract readable content from any URL - /api/tools/web-extract",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *🌐 WEB EXTRACT - LIVE ✅* ─
│ Scrape readable text + links + meta
│
├─ *📌 USAGE*
│.webextract https://example.com
│.webextract https://news.ycombinator.com
│.webextract https://github.com/omegatech-01
│
├─ *⚙️ PARAMS*
│ url=target URL (required)
│ action=extract (optional, auto)
│
├─ *🔥 RETURNS*
│ title, text, links, meta description
│
╰─ Endpoint: /api/tools/web-extract`
      );
    }

    let url = q.trim().split(/\s+/)[0];
    if (!url.startsWith('http')) {
      return reply('❌ Need valid URL\nEx:.webextract https://example.com');
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    // Try multiple param combos - Omegatech style
    let resData;
    try {
      const { data } = await axios.get(API, { params: { url }, timeout: 30000 });
      resData = data;
    } catch {
      try {
        const { data } = await axios.get(API, { params: { action: 'extract', url }, timeout: 30000 });
        resData = data;
      } catch (e2) {
        throw e2;
      }
    }

    const d = resData?.data || resData?.result || resData;
    const title = d?.title || d?.meta?.title || url;
    const text = d?.text || d?.content || d?.extracted || d?.body || '';
    const desc = d?.description || d?.meta?.description || '';
    const links = d?.links || [];

    if (!text &&!title && (!links || links.length===0)) {
      return reply(`⚠️ Empty or raw:\n\`\`\`${JSON.stringify(resData, null, 2).slice(0,1500)}\`\`\``);
    }

    let msg = `*🌐 WEB EXTRACT DONE ✅*\n\n`;
    msg += `*URL:* ${url}\n`;
    msg += `*Title:* ${title}\n`;
    if (desc) msg += `*Desc:* ${desc.slice(0,200)}\n`;
    msg += `\n*Content (${text.length} chars):*\n`;
    msg += text.slice(0, 3500);
    if (text.length > 3500) msg += `\n\n... +${text.length-3500} chars more (sending file)`;

    await conn.sendMessage(from, { text: msg }, { quoted: mek });

    if (text.length > 3500) {
      await conn.sendMessage(from, {
        document: Buffer.from(`Title: ${title}\nURL: ${url}\n\n${text}`),
        mimetype: 'text/plain',
        fileName: `extract-${Date.now()}.txt`
      }, { quoted: mek });
    }

    if (links && links.length > 0) {
      let lmsg = `*🔗 Links (${links.length}):*\n`;
      links.slice(0, 20).forEach((l,i)=>{
        const href = typeof l === 'string'? l : (l.href || l.url);
        lmsg += `${i+1}. ${href}\n`;
      });
      if (links.length > 20) lmsg += `+${links.length-20} more...\n`;
      await conn.sendMessage(from, { text: lmsg }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('WebExtract error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.message || e.message}\n\nTry:.webextract https://example.com`);
  }
});
