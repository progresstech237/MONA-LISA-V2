const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/magicstudio';

async function generateImage(prompt) {
  // Try as JSON first
  const { data, headers } = await axios.get(API, {
    params: { prompt },
    timeout: 90000,
    responseType: 'arraybuffer' // handle both json and image
  });

  const contentType = headers['content-type'] || '';

  // If it's JSON
  if (contentType.includes('application/json') || data.toString().trim().startsWith('{')) {
    try {
      const json = JSON.parse(Buffer.from(data).toString('utf8'));
      return json;
    } catch {}
  }

  // If it's direct image
  if (contentType.includes('image')) {
    return { imageBuffer: Buffer.from(data), direct: true };
  }

  // Try parse as json anyway
  try {
    const json = JSON.parse(Buffer.from(data).toString('utf8'));
    return json;
  } catch {
    return { imageBuffer: Buffer.from(data), direct: true };
  }
}

cmd({
  pattern: "magicstudio",
  alias: ["magic", "mstudio", "ms", "mgenimg", "maigen", "magicimg"],
  react: "🎨",
  desc: "MagicStudio - Generate AI image via prompt - /api/ai/magicstudio",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *🎨 MAGICSTUDIO - LIVE ✅* ─
│ Generate AI image via prompt
│
├─ *📌 USAGE*
│.magicstudio a cat walking on the beach at sunset, cinematic
│.magic a cyberpunk city at night, neon lights
│.magic anime girl with wings, ultra detailed
│.magic portrait of a lion king, 8k
│
├─ *🔥 EXAMPLES*
│.magic a cat walking on the beach at sunset
│.magic iron man suit in desert, cinematic
│.magic futuristic car flying over city
│
╰─ Endpoint: /api/ai/magicstudio?prompt=`
      );
    }

    await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    const prompt = q.trim();
    const result = await generateImage(prompt);

    // Case 1: Direct image buffer
    if (result.direct && result.imageBuffer) {
      return await conn.sendMessage(from, {
        image: result.imageBuffer,
        caption: `*🎨 MAGICSTUDIO*\n*Prompt:* ${prompt}\n\n> @Progress Tech • Generated via MagicStudio`
      }, { quoted: mek });
    }

    // Case 2: JSON response
    const json = result.data || result;
    const imageUrl = json?.imageUrl || json?.data?.imageUrl || json?.url || json?.data?.url || json?.result || json?.image;

    // If json contains base64
    if (json?.data?.base64 || json?.base64) {
      const b64 = json.data?.base64 || json.base64;
      const buf = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      return await conn.sendMessage(from, {
        image: buf,
        caption: `*🎨 MAGICSTUDIO*\n*Prompt:* ${prompt}`
      }, { quoted: mek });
    }

    if (imageUrl && imageUrl.startsWith('http')) {
      // Download and send as FILE
      const imgBuf = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 40000 }).then(r=>Buffer.from(r.data));
      return await conn.sendMessage(from, {
        image: imgBuf,
        caption: `*🎨 MAGICSTUDIO*\n*Prompt:* ${prompt}\n*Link:* ${imageUrl}`
      }, { quoted: mek });
    }

    // Fallback: try to get image from data as buffer if API returns raw
    if (json?.statusCode === 200 && json?.success) {
      // Some endpoints return binary inside data?
      // Try second call expecting json
      const { data } = await axios.get(API, { params: { prompt }, timeout: 60000 });
      const url = data?.data?.imageUrl || data?.imageUrl || data?.url;
      if (url) {
        const buf = await axios.get(url, { responseType: 'arraybuffer' }).then(r=>Buffer.from(r.data));
        return await conn.sendMessage(from, {
          image: buf,
          caption: `*🎨 MAGICSTUDIO*\n*Prompt:* ${prompt}\n*URL:* ${url}`
        }, { quoted: mek });
      }
    }

    return reply(`❌ No image returned: ${JSON.stringify(result).slice(0,600)}\nTry:.magicstudio a cat walking on the beach at sunset`);

  } catch (e) {
    console.error('MagicStudio error', e.response?.data || e.message);
    const errData = e.response?.data ? Buffer.from(e.response.data).toString().slice(0,500) : e.message;
    reply(`❌ *MagicStudio Failed*\n${errData}\n\nTry:.magicstudio a cat walking on the beach at sunset, cinematic`);
  }
});
