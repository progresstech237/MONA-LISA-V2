const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/Maker/Ephoto';

async function callAPI(params) {
  const { data } = await axios.get(API, { params, timeout: 60000 });
  return data;
}

cmd({
  pattern: "ephoto360",
  alias: ["ephoto360", "ep", "textmaker"],
  react: "🎨",
  desc: "ePhoto360 - categories, effects, search, generate - /api/Maker/Ephoto",
  category: "maker",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *🎨 EPHOTO360 - LIVE ✅* ─
│ Huge library: 500+ effects
│
├─ *📌 COMMANDS*
│.ephoto360 categories - List all cats
│.ephoto360 effects game-effect-c9
│.ephoto360 effects text-effects-c6
│.ephoto search pubg
│.ephoto360 search fire
│.ephoto360 info https://en.ephoto360.com/...
│.ephoto gen https://en.ephoto360.com/... | PROGRESS TECH
│
├─ *📂 YOUR CATEGORIES*
│ • merry-christmas-c19 (ID 19)
│ • new-year-c20 (ID 20)
│ • 3d-effect-c21 (ID 21)
│ • text-effects-c6 (ID 6)
│ • game-effect-c9 (ID 9)
│ • love-c7 (ID 7)
│
├─ *🔥 EXAMPLES*
│.ephoto360 categories
│.ephoto360 effects game-effect-c9
│.ephoto360 search neon
│.ephoto360 gen https://en.ephoto360.com/create-green-neon-light-effects-... | Progress Tech
│
╰─ Returns normal image`
      );
    }

    const low = q.toLowerCase().trim();
    const args = q.trim();

    if (low.startsWith('categories') || low === 'cats' || low === 'list') {
      await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });
      const data = await callAPI({ action: 'categories' });
      const cats = data?.data || data;
      let msg = `*🎨 EPHOTO360 CATEGORIES ✅*\n\n`;
      (Array.isArray(cats)?cats:[]).slice(0,30).forEach(c => {
        msg += `• *${c.name}* - \`${c.slug}\` ID:${c.id}\n`;
      });
      msg += `\nUse:\n.ephoto effects <slug>\nEx:.ephoto effects game-effect-c9`;
      return reply(msg);
    }

    if (low.startsWith('effects')) {
      let slug = args.replace(/effects/i,'').trim() || 'game-effect-c9';
      await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
      const data = await callAPI({ action: 'effects', category: slug, pages: 1 });
      const effects = data?.data || data?.effects || data;
      if (!Array.isArray(effects)) return reply(`Raw:\n${JSON.stringify(data).slice(0,1500)}`);
      let msg = `*🎮 EFFECTS - ${slug} ✅*\nFound: ${effects.length}\n\n`;
      effects.slice(0,15).forEach((e,i)=>{
        msg += `${i+1}. ${e.name||e.title||e.slug}\n ${e.url||e.effect||''}\n`;
      });
      msg += `\nGenerate:\n.ephoto gen <effect_url> | Your Text`;
      return reply(msg);
    }

    if (low.startsWith('search')) {
      let query = args.replace(/search/i,'').trim();
      if (!query) return reply('❌ Example:.ephoto search pubg');
      await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
      const data = await callAPI({ action: 'search', query });
      const results = data?.data || data?.results || data;
      let msg = `*🔍 SEARCH - "${query}" ✅*\n\n`;
      if (Array.isArray(results)) {
        results.slice(0,15).forEach((e,i)=>{
          msg += `${i+1}. ${e.name||e.slug}\n ${e.url}\n`;
        });
      } else {
        msg += JSON.stringify(data).slice(0,1200);
      }
      return reply(msg);
    }

    if (low.startsWith('info')) {
      let url = args.replace(/info/i,'').trim();
      if (!url.includes('http')) return reply('❌ Need effect URL\n.ephoto info https://en.ephoto360.com/...');
      const data = await callAPI({ action: 'info', effect: url });
      return reply(`*ℹ️ EFFECT INFO*\n\n${JSON.stringify(data, null, 2).slice(0,1500)}`);
    }

    if (low.startsWith('gen') || args.includes('https://en.ephoto360.com')) {
      let effectUrl = '';
      let texts = [];

      // Format:.ephoto gen URL | text1 | text2
      let cleaned = args.replace(/^gen\s+/i,'').trim();
      const parts = cleaned.split('|').map(s=>s.trim()).filter(Boolean);

      effectUrl = parts[0];
      texts = parts.slice(1);
      if (texts.length === 0) texts = ['PROGRESS TECH'];

      if (!effectUrl.includes('http')) return reply('❌ Need effect URL\n.ephoto gen https://en.ephoto360.com/effect-link | Your Text');

      await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      await conn.sendPresenceUpdate('composing', from);
      await reply(`⏳ Generating...\nEffect: ${effectUrl}\nTexts: ${texts.join(', ')}`);

      const data = await callAPI({
        action: 'generate',
        effect: effectUrl,
        texts: texts.join(','), // API may expect array, try comma
        text: texts[0] // fallback
      });

      // Try to find image URL
      const resultUrl = data?.data?.image || data?.data?.url || data?.data?.result || data?.url || data?.result || (typeof data?.data === 'string'? data.data : null);

      if (!resultUrl ||!resultUrl.startsWith('http')) {
        // Maybe raw PNG
        if (data?.data && typeof data.data!== 'object') {
          // Might already be buffer? Try direct download
          const imgRes = await axios.get(API, {
            params: { action: 'generate', effect: effectUrl, texts: texts[0], text: texts[0] },
            responseType: 'arraybuffer',
            timeout: 60000
          });
          const buf = Buffer.from(imgRes.data);
          return await conn.sendMessage(from, { image: buf, caption: `*🎨 EPHOTO DONE ✅*\n*Effect:* ${effectUrl}\n*Text:* ${texts.join(' | ')}` }, { quoted: mek });
        }
        return reply(`Raw response:\n${JSON.stringify(data).slice(0,1200)}\n\nIf image URL missing, try:.ephoto info ${effectUrl}`);
      }

      // Download image and send as NORMAL IMAGE
      const imgBuf = await axios.get(resultUrl, { responseType: 'arraybuffer', timeout: 60000 }).then(r=>Buffer.from(r.data));

      await conn.sendMessage(from, {
        image: imgBuf,
        caption: `*🎨 EPHOTO360 DONE ✅*\n*Effect:* ${effectUrl}\n*Text:* ${texts.join(' | ')}\n*URL:* ${resultUrl}\n\n> @Omegatech-01`
      }, { quoted: mek });

      return;
    }

    return reply('❌ Unknown action. Use:.ephoto categories | effects | search | gen');

  } catch (e) {
    console.error('Ephoto error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.message || e.message}\n\nTry:.ephoto categories`);
  }
});
