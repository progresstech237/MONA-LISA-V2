const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://sora.aritek.app/api/generate';

function getThumb() {
    try {
        for (const p of ['./media/menu1.png','./media/menu2.png']) {
            if (fs.existsSync(p)) return fs.readFileSync(p);
        }
        return null;
    } catch { return null; }
}

cmd({
  pattern: "sora3",
  alias: ["soravideo3", "soraai3", "t2v", "aritek3"],
  react: "🎬",
  desc: "Sora AI Video - Text to Video + Image to Video, 16:9 9:16 1:1",
  category: "progresstech ai",
  use: ".sora a cat walking on beach |.sora 9:16 Mona Lisa dancing (reply image for img2vid)",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let rawQ = q || "";
    const inter = mek.message?.interactiveResponseMessage;
    if (inter?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const p = JSON.parse(inter.nativeFlowResponseMessage.paramsJson);
            if (p.id) rawQ = p.id.replace(prefix,"").trim();
        } catch {}
    }
    if (mek.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        rawQ = mek.message.listResponseMessage.singleSelectReply.selectedRowId.replace(prefix,"").trim();
    }
    if (rawQ.startsWith(prefix)) rawQ = rawQ.replace(new RegExp(`^${prefix}[a-z0-9-]+\\s*`, 'i'), '').trim();

    const ctx = {
        forwardingScore: 999, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: NEWSLETTER_JID,
            serverMessageId: 1,
            newsletterName: '🥷TECH TOY🧑‍💻™ ✓'
        }
    };

    // Check for image (reply or direct)
    let imageBuffer = null;
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        if (quoted) {
            imageBuffer = await conn.downloadMediaMessage({ message: { imageMessage: quoted } });
        } else if (mek.message?.imageMessage) {
            imageBuffer = await conn.downloadMediaMessage(mek);
        }
    } catch {}

    const hasImage =!!imageBuffer;

    if (!rawQ || rawQ.toLowerCase() === 'help' || rawQ.toLowerCase() === 'menu') {
        let thumb = null;
        try {
            const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
            const tb = getThumb();
            if (tb) {
                const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer });
                thumb = media.imageMessage;
            }
        } catch {}

        const menu = `┏━━〔 🎬 Sora AI Video 〕━━┓
┃ Sora Text + Image to Video
┃ via Aritek API
┃
┃ *Usage - Text to Video:*
┃ ${prefix}sora a cat walking on beach sunset cinematic
┃ ${prefix}sora 16:9 futuristic city drone shot
┃ ${prefix}sora 9:16 Mona Lisa V2 dancing party vibe
┃ ${prefix}sora 1:1 cat dancing
┃
┃ *Usage - Image to Video:*
┃ Reply to image + ${prefix}sora make it dance
┃ Reply to image + ${prefix}sora 9:16 slow zoom cinematic
┃
┃ *Ratios:*
┃ 16:9 - Landscape / YouTube
┃ 9:16 - Portrait / TikTok / Reels
┃ 1:1 - Square / Instagram
┗━━━━━━━━━━━━━━┛
`;

        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🐱 Cat Beach 1:1", id: `${prefix}sora 1:1 a cat walking on the beach at sunset, cinematic` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "👑 Mona Lisa 9:16", id: `${prefix}sora 9:16 beautiful girl in green velvet dress dancing in luxury party, cinematic` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🌃 City 16:9", id: `${prefix}sora 16:9 cinematic drone shot of futuristic city at sunset` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 TECH TOY Channel", url: CHANNEL_LINK }) }
        ];

        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "🎬 Sora • Aritek AI", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
                body: { text: menu },
                footer: { text: BRAND },
                nativeFlowMessage: { buttons }
            },
            contextInfo: ctx
        }, {});
    }

    await conn.sendMessage(from, { react: { text: hasImage? "🖼️" : "🎬", key: mek.key } });

    let prompt = rawQ;
    let aspectRatio = "1:1"; // your JSON example used 1:1

    const arMatch = rawQ.match(/(16:9|9:16|1:1)/i);
    if (arMatch) {
        aspectRatio = arMatch[1];
        prompt = rawQ.replace(arMatch[1], '').trim();
    }

    if (!prompt && hasImage) prompt = "animate this image, cinematic motion, 4k, smooth";
    if (!prompt) prompt = rawQ;

    reply(`*🎬 Sora Generating...*\n*Mode:* ${hasImage? 'Image to Video' : 'Text to Video'}\n*Prompt:* ${prompt.slice(0,120)}\n*Ratio:* ${aspectRatio}\n*Sound:* AI ON\n\n_Wait 40-90 sec..._\n\n_${BRAND}_`);

    let videoUrl = null;
    let fullResult = null;

    // --- Image to Video via FormData ---
    if (hasImage) {
        try {
            const form = new FormData();
            form.append('image', imageBuffer, { filename: 'input.jpg', contentType: 'image/jpeg' });
            form.append('image_file', imageBuffer, { filename: 'input.jpg', contentType: 'image/jpeg' });
            form.append('file', imageBuffer, { filename: 'input.jpg', contentType: 'image/jpeg' });
            form.append('prompt', prompt);
            form.append('text', prompt);
            form.append('aspect_ratio', aspectRatio);
            form.append('aspectRatio', aspectRatio);
            form.append('ai_sound', 'true');

            const { data } = await axios.post(API, form, {
                timeout: 180000,
                headers: {...form.getHeaders() },
            });

            fullResult = data.result || data.data || data;
            videoUrl = fullResult?.url || data.url || data.video_url || data.data?.url;

        } catch (e) {
            console.log('Sora image POST error', e.response?.data || e.message);
            // fallback base64
            try {
                const base64 = imageBuffer.toString('base64');
                const { data } = await axios.post(API, {
                    prompt: prompt,
                    aspect_ratio: aspectRatio,
                    ai_sound: true,
                    image: `data:image/jpeg;base64,${base64}`
                }, { timeout: 180000 });

                fullResult = data.result || data.data || data;
                videoUrl = fullResult?.url || data.url;
            } catch (e2) {
                console.log('Sora base64 fallback failed', e2.message);
            }
        }
    }

    // --- Text to Video POST ---
    if (!videoUrl) {
        try {
            const { data } = await axios.post(API, {
                prompt: prompt,
                aspect_ratio: aspectRatio,
                ai_sound: true
            }, { timeout: 180000, headers: { 'Content-Type': 'application/json' } });

            fullResult = data.result || data.data || data;
            videoUrl = fullResult?.url || fullResult?.video_url || data.url || data.videoUrl || data.data?.url;
            if (!videoUrl && typeof fullResult === 'string' && fullResult.startsWith('http')) videoUrl = fullResult;

        } catch (e) {
            console.log('Sora text POST failed', e.message);
        }
    }

    // --- GET Fallback (your example URL pattern) ---
    if (!videoUrl) {
        const urls = [
            `${API}?prompt=${encodeURIComponent(prompt)}&aspect_ratio=${encodeURIComponent(aspectRatio)}&ai_sound=true`,
            `https://sora.aritek.app/generated/t2v2StS510179pqv6e9pknrm80csya4t8ae638-ft300P.mp4`
        ];
        for (const u of urls) {
            try {
                const { data } = await axios.get(u, { timeout: 180000 });
                videoUrl = data.result?.url || data.data?.url || data.url || data.video_url;
                if (videoUrl) { fullResult = data.result || data.data || data; break; }
            } catch {}
        }
    }

    if (!videoUrl) throw new Error('No video URL returned from Sora API');

    // Send as Video
    await conn.sendMessage(from, {
        video: { url: videoUrl },
        mimetype: 'video/mp4',
        caption: `*✅ Sora Video Ready*\n*Prompt:* ${prompt}\n*Mode:* ${hasImage? 'Image to Video' : 'Text to Video'}\n*Ratio:* ${aspectRatio}\n\n*${BRAND}*\n${CHANNEL_LINK}`,
        contextInfo: ctx
    }, { quoted: mek });

    // Also send document for download
    await conn.sendMessage(from, {
        document: { url: videoUrl },
        mimetype: 'video/mp4',
        fileName: `sora-${Date.now()}.mp4`,
        caption: `File: sora-${Date.now()}.mp4\n${BRAND}`,
        contextInfo: ctx
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Sora Error:', e.response?.data || e.message);
    reply(`*❌ Sora Failed*\n${e.response?.data?.message || e.message}\n\nTry: ${'.sora a cat walking on beach at sunset, cinematic'}`);
  }
});