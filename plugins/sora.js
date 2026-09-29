const { cmd } = require('../redx');
const axios = require('axios');
const API = 'https://apis.davidcyril.name.ng/ai/txt2vid';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';

cmd({
  pattern: "sora",
  react: "🎬",
  desc: "Sora AI Video - with auto speech fix",
  category: "progresstech ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let prompt = q || "";
    if (prompt.startsWith(prefix)) prompt = prompt.replace(new RegExp(`^${prefix}[a-z0-9-]+\\s*`, 'i'), '').trim();
    if (!prompt) return reply(`*Usage:*\n${prefix}sora a girl saying "I love Progress Tech"\n${prefix}sora a boy in space saying "world is full of hacks"`);

    let aspect_ratio = "16:9";
    const arMatch = prompt.match(/(16:9|9:16|1:1)/i);
    if (arMatch) { aspect_ratio = arMatch[1]; prompt = prompt.replace(arMatch[1], '').trim(); }

    // AUTO FIX for saying/singing without quotes
    if ((prompt.toLowerCase().includes('saying') || prompt.toLowerCase().includes('singing')) && !prompt.includes('"')) {
        // find saying part
        prompt = prompt.replace(/saying\s+(.*)/i, (match, p1) => `saying "${p1.trim()}"`);
        prompt = prompt.replace(/singing\s+(.*)/i, (match, p1) => `singing "${p1.trim()}"`);
    }

    // Add cinematic if not there for better quality
    if (!prompt.toLowerCase().includes('cinematic')) prompt += ', cinematic, clear audio';

    await conn.sendMessage(from, { text: `*🎬 Generating...*\n*Prompt:* ${prompt}\n*Ratio:* ${aspect_ratio}\n\n_Wait 40s..._` }, { quoted: mek });

    const { data } = await axios.get(`${API}?prompt=${encodeURIComponent(prompt)}&aspect_ratio=${aspect_ratio}&ai_sound=true`, { timeout: 180000 });
    const videoUrl = data.result?.url || data.url || data.data?.url;
    if (!videoUrl) throw new Error('API did not return URL: ' + JSON.stringify(data).slice(0,300));

    const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });

    await conn.sendMessage(from, {
        video: Buffer.from(videoRes.data),
        mimetype: 'video/mp4',
        caption: `*✅ Sora Video*\n*Prompt:* ${prompt}\n\n*${BRAND}*`
    }, { quoted: mek });

  } catch (e) {
    console.error(e);
    reply(`*❌ Error:* ${e.message}`);
  }
});