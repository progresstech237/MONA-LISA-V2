const { cmd } = require('../redx');
const axios = require('axios');
const FormData = require('form-data');

let bananaSession = {};

// ===== FIXED UPLOAD - detects replied image properly + 2 CDNs =====
async function uploadMedia(m) {
    try {
        // FIX: Proper redx quoted image detection
        let q = null;
        if (m.quoted) {
            if (m.quoted.mtype === 'imageMessage') q = m.quoted;
            else if (m.quoted.message?.imageMessage) q = m.quoted;
            else if (m.quoted.msg?.mimetype?.includes('image')) q = m.quoted;
            else q = m.quoted; // try anyway if user replied
        } else if (m.mtype === 'imageMessage' || m.message?.imageMessage) {
            q = m;
        }

        if (!q) return null;

        const media = await q.download();
        if (!media) return null;

        // Try 1: malvryx
        try {
            const form = new FormData();
            form.append('file', media, { filename: 'image.jpg' });
            form.append('type', 'permanent');
            const res = await axios.post('https://tmp.malvryx.dev/upload', form, { headers: form.getHeaders(), timeout: 30000 });
            if (res.data?.cdnUrl || res.data?.directUrl) return res.data.cdnUrl || res.data.directUrl;
        } catch {}

        // Try 2: catbox - stable
        try {
            const form2 = new FormData();
            form2.append('reqtype', 'fileupload');
            form2.append('fileToUpload', media, { filename: 'image.jpg' });
            const res2 = await axios.post('https://catbox.moe/user/api.php', form2, { headers: form2.getHeaders(), timeout: 30000 });
            if (res2.data && res2.data.startsWith('http')) return res2.data;
        } catch (e) {
            console.log('Catbox fail', e.message);
        }

        return null;
    } catch (e) {
        console.log('Upload err', e.message);
        return null;
    }
}

cmd({
  pattern: "nano",
  alias: ["nana", "nanobana"],
  react: "🍌",
  desc: "Generate or edit image with Nano-Banana AI",
  category: "progresstech ai",
  use: ".nano <prompt> | reply to image.nano <prompt>",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    let prompt = q || m.quoted?.text || m.msg?.caption || "";
    // FIX: Keep original face instruction
    if (prompt) {
        prompt = `Keep the exact same person, same face, same clothes, same background. Do not change identity. Only ${prompt}. Photorealistic, 8k`;
    }

    const imageUrl = await uploadMedia(m);
    console.log('Image URL:', imageUrl? 'Got it' : 'NULL - will generate not edit');

    if (imageUrl) {
      if (!q) return reply(`*🍌 You want to edit an image?*\n\n*Reply to an image and type:*\n*👑.nano make it zombie 👑*`);
      await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });
      reply(`*🍌 Editing your image... Please wait ☺️*\n_Keeping original face..._`);

      const { data: init } = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(prompt)}&image=${encodeURIComponent(imageUrl)}`, { timeout: 30000 });

      let resultUrl = null;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const { data: check } = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${init.task_id}`, { timeout: 15000 });
        if (check.status === 'completed') { resultUrl = check.image_url; break; }
        if (check.status === 'failed') throw new Error('Edit failed on server');
      }

      if (resultUrl) {
        const imgBuf = await axios.get(resultUrl, { responseType: 'arraybuffer' });
        await conn.sendMessage(from, {
          image: Buffer.from(imgBuf.data),
          caption: `*🍌 NANO EDIT SUCCESS 👑*\n\n*📝 Prompt: ${q}*\n*👑 By: MONA LISA MINI BOT 👑*`
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
      } else reply(`*❌ Edit timed out. Try again.*`);
      return;
    }

    // TEXT TO IMAGE MODE
    if (!q) return reply(`*🍌 Want to generate AI image?*\n\n*Type like this:*\n*👑.nano a cute cat 👑*\n\n*To edit an image, reply to an image and type:*\n*👑.nano make it cartoon 👑*`);

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    reply(`*🍌 Generating your image... Please wait ☺️*`);

    const { data } = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro?prompt=${encodeURIComponent(q)}`, { timeout: 60000 });

    if (data.image) {
      const imgBuf = await axios.get(data.image, { responseType: 'arraybuffer' });
      await conn.sendMessage(from, {
        image: Buffer.from(imgBuf.data),
        caption: `*🍌 NANO PRO GENERATION 👑*\n\n*📝 Prompt: ${q}*\n*👑 By: MONA LISA MINI BOT 👑*`
      }, { quoted: mek });
      await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } else reply(`*❌ No image generated.*`);
  } catch (e) {
    console.log("NANO ERROR:", e.response?.data || e.message);
    reply(`*❌ Error:*\n*${e.message}*`);
  }
});

// ============ NANO PRO - Collector Mode ============
cmd({
  pattern: "nanopro",
  alias: ["nanocollect", "nanoblend"],
  react: "🚀",
  desc: "Collect up to 4 images and blend them",
  category: "progresstech ai",
  use: ".nanopro (reply to image) |.nanopro done <prompt>",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    const userId = m.sender;
    if (!bananaSession[userId]) bananaSession[userId] = { images: [] };

    if (q?.toLowerCase().startsWith('done')) {
      const session = bananaSession[userId];
      const finalPrompt = q.replace(/done/i, '').trim();
      if (session.images.length < 2) return reply(`*⚠️ Please add at least 2 images.*\n*Currently: ${session.images.length}/4*`);
      if (!finalPrompt) return reply(`*📝 Please provide a prompt as well.*\n*👑.nanopro done make them together 👑*`);

      await conn.sendMessage(from, { react: { text: "🕒", key: mek.key } });
      reply(`*🍌 Blending ${session.images.length} images...*\n*📝 Prompt: ${finalPrompt}*`);

      let apiUrl = `https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3?prompt=${encodeURIComponent(finalPrompt)}`;
      session.images.forEach((url, i) => { apiUrl += `&image${i + 1}=${encodeURIComponent(url)}`; });

      const { data: initRes } = await axios.get(apiUrl);
      if (!initRes.success) throw new Error('API failed to initiate blend.');
      const taskId = initRes.task_id;
      let resultUrl = null; let attempts = 0;
      while (!resultUrl && attempts < 25) {
        await new Promise(r => setTimeout(r, 5000));
        const { data: check } = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${taskId}`);
        if (check.status === 'completed' && check.image_url) { resultUrl = check.image_url; break; }
        if (check.status === 'failed') throw new Error('Server reported generation failure.');
        attempts++;
      }
      if (!resultUrl) throw new Error('Generation timed out.');

      const imgBuf = await axios.get(resultUrl, { responseType: 'arraybuffer' });
      await conn.sendMessage(from, {
        image: Buffer.from(imgBuf.data),
        caption: `*🍌 NANO-BANANA PRO SUCCESS 👑*\n\n*🖼️ Images Blended: ${session.images.length}*\n*📝 Prompt: ${finalPrompt}*\n*👑 By: MONA LISA MINI BOT 👑*`
      }, { quoted: mek });
      await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
      delete bananaSession[userId];
      return;
    }

    const link = await uploadMedia(m);
    if (!link) return reply(`*📸 COLLECTOR MODE ON*\n\n*Reply to an image with 👑.nanopro 👑 or send image with caption.nanopro*\n\n*When done, type:*\n*👑.nanopro done your prompt 👑*\n\n*Currently: ${bananaSession[userId].images.length}/4 images*`);

    if (bananaSession[userId].images.length >= 4) return reply(`*❌ Maximum 4 images limit reached.*\n*Now type:*\n*👑.nanopro done <prompt> 👑*`);

    bananaSession[userId].images.push(link);
    await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });
    reply(`*✅ Image ${bananaSession[userId].images.length}/4 Added*\n\n*Send another image or type:*\n*👑.nanopro done <prompt> 👑*`);
  } catch (e) {
    console.log("NANOPRO ERROR:", e.response?.data || e.message);
    reply(`*❌ Error: ${e.message}*`);
    delete bananaSession[m.sender];
  }
});